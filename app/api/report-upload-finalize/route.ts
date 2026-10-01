import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canWriteArea, isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";
import { MAX_FILE_SIZE, POST as saveReport } from "../report-uploads/route";

const MAX_CHUNKS = 32;

function getBucket() {
  return (env as unknown as { BUCKET: R2Bucket }).BUCKET;
}

function safeIdentity(email: string) {
  return email.toLowerCase().replace(/[^a-z0-9.-]+/g, "_");
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });

  const keys: string[] = [];
  try {
    const input = await request.json() as Record<string, unknown>;
    const area = String(input.area ?? "").trim();
    const reportDate = String(input.reportDate ?? "").trim();
    const responsible = String(input.responsible ?? "").trim();
    const extractedText = String(input.extractedText ?? "").trim().slice(0, 40000);
    const uploadId = String(input.uploadId ?? "").trim();
    const count = Number(input.count);
    const fileName = String(input.fileName ?? "").trim().slice(0, 200);
    const mimeType = String(input.mimeType ?? "application/octet-stream").trim();

    if (!canWriteArea(user, area)) return Response.json({ error: `Su rol (${user.role}) no puede cargar informes de ${area}` }, { status: 403 });
    if (!/^[a-f0-9-]{36}$/i.test(uploadId) || !Number.isInteger(count) || count < 1 || count > MAX_CHUNKS) {
      return Response.json({ error: "Carga dividida no válida" }, { status: 400 });
    }
    if (!fileName) return Response.json({ error: "Nombre de archivo no válido" }, { status: 400 });

    const parts: ArrayBuffer[] = [];
    let totalSize = 0;
    for (let index = 0; index < count; index += 1) {
      const key = `temporary-report-parts/${safeIdentity(user.email)}/${uploadId}/${index}`;
      keys.push(key);
      const object = await getBucket().get(key);
      if (!object) return Response.json({ error: `Falta la parte ${index + 1} del archivo. Intente cargarlo nuevamente.` }, { status: 400 });
      const bytes = new Uint8Array(await object.arrayBuffer());
      totalSize += bytes.byteLength;
      if (totalSize > MAX_FILE_SIZE) return Response.json({ error: "El archivo supera el máximo de 15 MB" }, { status: 400 });
      parts.push(Uint8Array.from(bytes).buffer);
    }

    const file = new File(parts, fileName, { type: mimeType });
    const form = new FormData();
    form.set("area", area);
    form.set("reportDate", reportDate);
    form.set("responsible", responsible);
    form.set("extractedText", extractedText);
    form.set("file", file);
    const response = await saveReport(new Request("https://internal/api/report-uploads", { method: "POST", body: form }));
    await Promise.all(keys.map((key) => getBucket().delete(key)));
    return response;
  } catch {
    await Promise.all(keys.map((key) => getBucket().delete(key)).map((promise) => promise.catch(() => undefined)));
    return Response.json({ error: "No fue posible reconstruir y guardar el informe" }, { status: 500 });
  }
}
