import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { dailyReportUploads } from "@macobsa-schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../../access-control";

function getBucket() {
  return (env as unknown as { BUCKET: R2Bucket }).BUCKET;
}

function getAssets(): Fetcher | undefined {
  return (env as unknown as { ASSETS?: Fetcher }).ASSETS;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authenticated = await getChatGPTUser();
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  const { id } = await context.params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId)) return Response.json({ error: "Informe no válido" }, { status: 400 });
  const [report] = await getDb().select().from(dailyReportUploads).where(eq(dailyReportUploads.id, reportId)).limit(1);
  if (!report) return Response.json({ error: "Informe no encontrado" }, { status: 404 });
  if (report.processingStatus === "voided") return Response.json({ error: "Informe anulado; el original está en el historial de correcciones." }, { status: 410 });
  const canReviewAll = user.role === "Dirección General" || user.role === "Auditoría y Control";
  if (!canReviewAll && !user.allowedAreas.includes(report.area)) return Response.json({ error: "No tiene acceso a este informe" }, { status: 403 });
  const assets = getAssets();
  if (report.objectKey.startsWith("static:") && assets) {
    const path = report.objectKey.slice("static:".length);
    const asset = await assets.fetch(new Request(new URL(path, request.url)));
    if (asset.ok) {
      const safeName = report.originalName.replace(/["\r\n]/g, "_");
      return new Response(await asset.arrayBuffer(), {
        headers: {
          "content-type": report.mimeType || "application/octet-stream",
          "content-disposition": `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(report.originalName)}`,
          "cache-control": "private, no-store",
        },
      });
    }
  }
  const object = await getBucket().get(report.objectKey);
  if (!object) {
    if (!report.extractedText.trim()) return Response.json({ error: "Archivo no disponible y sin evidencia textual" }, { status: 404 });
    const fallbackName = `${report.originalName.replace(/\.[^.]+$/, "") || `informe-${report.id}`}.txt`;
    return new Response(report.extractedText, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `${disposition}; filename="${fallbackName.replace(/["\r\n]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fallbackName)}`,
        "cache-control": "private, no-store",
        "x-macobsa-evidence-fallback": "extracted-text",
        "x-content-type-options": "nosniff",
      },
    });
  }
  const safeName = report.originalName.replace(/["\r\n]/g, "_");
  // Materialize the R2 stream before returning it. This prevents iOS share
  // sheets from receiving a zero-byte File when the stream is not consumed.
  const body = await object.arrayBuffer();
  return new Response(body, {
    headers: {
      "content-type": report.mimeType || "application/octet-stream",
      "content-disposition": `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(report.originalName)}`,
      "cache-control": "private, no-store",
    },
  });
}
