import { desc, inArray } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { departmentUpdates } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canWriteArea, isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";
const areas = new Set([
  "Comercial",
  "Operaciones",
  "Despacho",
  "Regulatorio",
  "Facturación",
  "Financiero",
  "Auditoría y Control",
  "Inhouse El Rosado",
]);
export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user))
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const canReviewAll =
      user.role === "Dirección General" || user.role === "Auditoría y Control";
    if (!canReviewAll && user.allowedAreas.length === 0) {
      return Response.json({ updates: [] });
    }
    const baseQuery = getDb()
      .select()
      .from(departmentUpdates);
    return Response.json({
      updates: canReviewAll
        ? await baseQuery
            .orderBy(desc(departmentUpdates.reportDate), desc(departmentUpdates.id))
            .limit(200)
        : await baseQuery
            .where(inArray(departmentUpdates.area, user.allowedAreas))
            .orderBy(desc(departmentUpdates.reportDate), desc(departmentUpdates.id))
            .limit(200),
    });
  } catch {
    return Response.json({ updates: [] });
  }
}
export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const area = String(p.area ?? ""),
      title = String(p.title ?? "").trim(),
      responsible = String(p.responsible ?? "").trim(),
      reportDate = String(p.reportDate ?? "").trim();
    if (!canWriteArea(user, area))
      return Response.json(
        { error: `Su rol (${user.role}) no puede registrar información de ${area}` },
        { status: 403 },
      );
    if (!areas.has(area) || !title || !responsible || !reportDate)
      return Response.json(
        { error: "Complete área, título, responsable y fecha" },
        { status: 400 },
      );
    const detail = String(p.detail ?? "").trim();
    if (area === "Comercial") {
      const requiredSections = ["Situación y antecedente:", "Gestión realizada:", "Respuesta o resultado:", "Próxima acción:", "Fecha compromiso:", "Evidencia o fuente:"];
      if (detail.length < 180 || requiredSections.some((section) => !detail.includes(section)))
        return Response.json(
          { error: "El avance comercial debe incluir situación, gestión, respuesta, próxima acción, fecha compromiso y evidencia." },
          { status: 400 },
        );
    }
    const [update] = await getDb()
      .insert(departmentUpdates)
      .values({
        area,
        title,
        responsible,
        reportDate,
        detail,
        metric: String(p.metric ?? "").trim(),
        status: String(p.status ?? "En seguimiento"),
        submittedBy: user.email,
      })
      .returning();
    return Response.json({ update }, { status: 201 });
  } catch {
    return Response.json(
      { error: "No fue posible guardar la actualización" },
      { status: 500 },
    );
  }
}
