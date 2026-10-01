import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { legalConsultations } from "@macobsa-schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { canAccessLegalModule, isAuthorizedCRMUser, resolveCRMUser } from "../../../../access-control";

function getBucket() { return (env as unknown as { BUCKET?: R2Bucket }).BUCKET; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user) || !canAccessLegalModule(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  const { id } = await context.params;
  const recordId = Number(id);
  if (!Number.isSafeInteger(recordId) || recordId <= 0) return Response.json({ error: "Registro no válido" }, { status: 400 });
  const [record] = await getDb().select().from(legalConsultations).where(eq(legalConsultations.id, recordId)).limit(1);
  if (!record) return Response.json({ error: "Evidencia no encontrada" }, { status: 404 });
  const bucket = getBucket();
  if (!bucket) return Response.json({ error: "El almacenamiento de evidencia no está disponible." }, { status: 503 });
  const object = await bucket.get(record.evidenceKey);
  if (!object) return Response.json({ error: "El archivo de evidencia no está disponible." }, { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const safeName = record.evidenceName.replace(/["\r\n]/g, "_");
  return new Response(await object.arrayBuffer(), { headers: {
    "content-type": record.evidenceMime,
    "content-disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(record.evidenceName)}`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  } });
}
