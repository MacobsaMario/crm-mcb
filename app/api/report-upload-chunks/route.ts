import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canWriteArea, isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

const MAX_CHUNK_SIZE = 600 * 1024;
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

  try {
    const form = await request.formData();
    const area = String(form.get("area") ?? "").trim();
    const uploadId = String(form.get("uploadId") ?? "").trim();
    const index = Number(form.get("index"));
    const count = Number(form.get("count"));
    const chunk = form.get("chunk");

    if (!canWriteArea(user, area)) return Response.json({ error: `Su rol (${user.role}) no puede cargar informes de ${area}` }, { status: 403 });
    if (!/^[a-f0-9-]{36}$/i.test(uploadId)) return Response.json({ error: "Identificador de carga no válido" }, { status: 400 });
    if (!Number.isInteger(index) || !Number.isInteger(count) || index < 0 || count < 1 || count > MAX_CHUNKS || index >= count) {
      return Response.json({ error: "Parte de archivo no válida" }, { status: 400 });
    }
    if (!(chunk instanceof File) || chunk.size <= 0 || chunk.size > MAX_CHUNK_SIZE) {
      return Response.json({ error: "La parte del archivo supera el límite seguro" }, { status: 400 });
    }

    const key = `temporary-report-parts/${safeIdentity(user.email)}/${uploadId}/${index}`;
    await getBucket().put(key, new Uint8Array(await chunk.arrayBuffer()), {
      httpMetadata: { contentType: "application/octet-stream" },
      customMetadata: { area, index: String(index), count: String(count), submittedBy: user.email },
    });
    return Response.json({ received: index + 1, count });
  } catch {
    return Response.json({ error: "No fue posible recibir una parte del archivo" }, { status: 500 });
  }
}
