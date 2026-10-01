import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { reportCorrectionHistory } from "@macobsa-schema";
import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { resolveCRMUser } from "../../../../../access-control";

export async function GET(_request: Request, context: { params: Promise<{ id: string; versionId: string }> }) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  const { id, versionId } = await context.params;
  const reportId = Number(id), historyId = Number(versionId);
  if (!Number.isSafeInteger(reportId) || !Number.isSafeInteger(historyId)) return Response.json({ error: "Versión no válida" }, { status: 400 });
  const [version] = await getDb().select().from(reportCorrectionHistory).where(and(eq(reportCorrectionHistory.reportId, reportId), eq(reportCorrectionHistory.id, historyId))).limit(1);
  if (!version) return Response.json({ error: "Versión no encontrada" }, { status: 404 });
  if (user.role !== "Dirección General" && user.role !== "Auditoría y Control" && (user.email.toLowerCase() !== version.submittedBy.toLowerCase() || !user.allowedAreas.includes(version.area))) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const object = await (env as unknown as { BUCKET: R2Bucket }).BUCKET.get(version.objectKey);
  if (!object) return Response.json({ error: "Archivo histórico no disponible" }, { status: 404 });
  const safeName = version.originalName.replace(/["\r\n]/g, "_");
  return new Response(await object.arrayBuffer(), { headers: { "content-type": version.mimeType || "application/octet-stream", "content-disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(version.originalName)}`, "cache-control": "private, no-store" } });
}
