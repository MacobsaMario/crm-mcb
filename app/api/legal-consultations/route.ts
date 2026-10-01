import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { legalConsultations } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canAccessLegalModule, isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;
const resultStatuses = new Set(["Pendiente de revisión técnica", "Coincide con expediente", "Requiere corrección", "Sin resultado concluyente"]);

function getBucket() { return (env as unknown as { BUCKET?: R2Bucket }).BUCKET; }

function officialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "aduana.gob.ec" || url.hostname.endsWith(".aduana.gob.ec") || url.hostname.endsWith(".gob.ec"));
  } catch { return false; }
}

function hasExpectedSignature(bytes: Uint8Array, mime: string) {
  if (mime === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user) || !canAccessLegalModule(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const rows = await getDb().select({
      id: legalConsultations.id,
      entityName: legalConsultations.entityName,
      ruc: legalConsultations.ruc,
      product: legalConsultations.product,
      subheading: legalConsultations.subheading,
      sourceLabel: legalConsultations.sourceLabel,
      sourceUrl: legalConsultations.sourceUrl,
      resultStatus: legalConsultations.resultStatus,
      resultSummary: legalConsultations.resultSummary,
      evidenceName: legalConsultations.evidenceName,
      evidenceSha256: legalConsultations.evidenceSha256,
      checkedByName: legalConsultations.checkedByName,
      checkedAt: legalConsultations.checkedAt,
    }).from(legalConsultations).orderBy(desc(legalConsultations.checkedAt), desc(legalConsultations.id)).limit(100);
    return Response.json({ consultations: rows });
  } catch {
    return Response.json({ error: "El historial no está disponible en este momento." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user) || !canAccessLegalModule(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  const bucket = getBucket();
  if (!bucket) return Response.json({ error: "El almacenamiento de evidencia no está disponible." }, { status: 503 });

  let evidenceKey = "";
  try {
    const form = await request.formData();
    const entityName = String(form.get("entityName") ?? "").trim().slice(0, 180);
    const ruc = String(form.get("ruc") ?? "").trim();
    const product = String(form.get("product") ?? "").trim().slice(0, 220);
    const subheading = String(form.get("subheading") ?? "").trim().slice(0, 20);
    const sourceLabel = String(form.get("sourceLabel") ?? "").trim().slice(0, 100);
    const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
    const resultStatus = String(form.get("resultStatus") ?? "").trim();
    const resultSummary = String(form.get("resultSummary") ?? "").trim().slice(0, 3000);
    const evidence = form.get("evidence");
    if (!entityName || !/^\d{13}$/.test(ruc) || !product || !sourceLabel || !officialUrl(sourceUrl) || !resultStatuses.has(resultStatus) || resultSummary.length < 20) {
      return Response.json({ error: "Complete empresa, RUC de 13 dígitos, producto, fuente oficial, resultado y resumen." }, { status: 400 });
    }
    if (!(evidence instanceof File)) return Response.json({ error: "Adjunte la captura o PDF oficial de la consulta." }, { status: 400 });
    const extension = evidence.name.split(".").pop()?.toLowerCase();
    const mime = extension === "pdf" ? "application/pdf" : extension === "png" ? "image/png" : ["jpg", "jpeg"].includes(extension ?? "") ? "image/jpeg" : "";
    if (!mime || evidence.size <= 0 || evidence.size > MAX_EVIDENCE_BYTES) return Response.json({ error: "La evidencia debe ser PDF, PNG o JPG, con tamaño máximo de 12 MB." }, { status: 400 });
    const bytes = new Uint8Array(await evidence.arrayBuffer());
    if (!hasExpectedSignature(bytes, mime)) return Response.json({ error: "El contenido del archivo no coincide con su formato declarado." }, { status: 400 });
    const checksum = await sha256(bytes);
    const safeName = evidence.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-140) || "evidencia.pdf";
    evidenceKey = `legal-consultations/${ruc}/${crypto.randomUUID()}-${safeName}`;
    await bucket.put(evidenceKey, bytes, { httpMetadata: { contentType: mime }, customMetadata: { ruc, checkedBy: user.email, sha256: checksum } });
    const checkedAt = new Date().toISOString();
    const [consultation] = await getDb().insert(legalConsultations).values({
      entityName, ruc, product, subheading, sourceLabel, sourceUrl, resultStatus, resultSummary,
      evidenceName: evidence.name.slice(0, 240), evidenceKey, evidenceMime: mime, evidenceBytes: bytes.byteLength,
      evidenceSha256: checksum, checkedBy: user.email, checkedByName: user.displayName, checkedAt,
    }).returning();
    if (!consultation) throw new Error("No se guardó el registro.");
    const { evidenceKey: _key, ...publicConsultation } = consultation;
    return Response.json({ consultation: publicConsultation }, { status: 201 });
  } catch {
    if (evidenceKey && bucket) await bucket.delete(evidenceKey).catch(() => undefined);
    return Response.json({ error: "No se pudo guardar la consulta. Revise su conexión e intente otra vez." }, { status: 500 });
  }
}
