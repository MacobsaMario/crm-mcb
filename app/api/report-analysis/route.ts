import { extractText as extractPdfText } from "unpdf";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canWriteArea, isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";
import { parseFinancialReport } from "../../financial-parser";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const form = await request.formData();
    const area = String(form.get("area") ?? "");
    const file = form.get("file");
    if (area !== "Financiero" || !canWriteArea(user, area)) return Response.json({ error: "No puede analizar informes de esta área" }, { status: 403 });
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "Seleccione un PDF válido de hasta 15 MB" }, { status: 400 });
    if (file.name.split(".").pop()?.toLowerCase() !== "pdf") return Response.json({ error: "Cartera debe cargarse en PDF" }, { status: 400 });
    const pdf = await extractPdfText(new Uint8Array(await file.arrayBuffer()), { mergePages: true });
    const analysis = parseFinancialReport(pdf.text);
    if (!analysis) return Response.json({ error: "No se identificaron todos los indicadores obligatorios de cartera" }, { status: 400 });
    return Response.json({ analysis });
  } catch {
    return Response.json({ error: "No fue posible leer el PDF de cartera" }, { status: 400 });
  }
}
