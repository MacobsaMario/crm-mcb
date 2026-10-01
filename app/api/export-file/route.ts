import { getChatGPTUser } from "../../chatgpt-auth";
import { resolveCRMUser } from "../../access-control";

const MAX_PDF_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (user.role !== "Dirección General") {
    return Response.json({ error: "Descarga reservada para Dirección General" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_PDF_SIZE) {
      return Response.json({ error: "El PDF no es válido" }, { status: 400 });
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Solo se admite el PDF generado por el CRM" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(await file.arrayBuffer(), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${safeName}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "No fue posible abrir el PDF" }, { status: 400 });
  }
}
