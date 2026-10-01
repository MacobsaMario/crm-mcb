import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { inhouseSnapshots } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

export async function GET() {
  const authenticated = await getChatGPTUser();
  if (!authenticated)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(resolveCRMUser(authenticated)))
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    return Response.json({
      snapshots: await getDb()
        .select()
        .from(inhouseSnapshots)
        .orderBy(desc(inhouseSnapshots.reportDate), desc(inhouseSnapshots.id))
        .limit(100),
    });
  } catch {
    return Response.json({ snapshots: [] });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!user.canManageInhouse)
    return Response.json(
      { error: `Su rol (${user.role}) no puede modificar Operaciones Inhouse` },
      { status: 403 },
    );
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const reportDate = String(p.reportDate ?? "").trim();
    const responsible = user.role === "Inhouse El Rosado"
      ? "Oliver Lay"
      : String(p.responsible ?? "").trim();
    const nextAction = String(p.nextAction ?? "").trim();
    const source = String(p.source ?? "").trim();
    if (!reportDate || !responsible || !nextAction || !source)
      return Response.json(
        { error: "Complete fecha, responsable, próxima acción y fuente" },
        { status: 400 },
      );
    const count = (value: unknown) => Math.max(0, Math.trunc(Number(value) || 0));
    const [snapshot] = await getDb()
      .insert(inhouseSnapshots)
      .values({
        reportDate,
        client: "Corporación El Rosado",
        davPending: count(p.davPending),
        urgentDav: count(p.urgentDav),
        readyForPickup: count(p.readyForPickup),
        checklistPending: count(p.checklistPending),
        storageAlerts: count(p.storageAlerts),
        responsible,
        nextAction,
        source,
        note: String(p.note ?? "").trim(),
        submittedBy: user.email,
      })
      .returning();
    return Response.json({ snapshot }, { status: 201 });
  } catch {
    return Response.json(
      { error: "No fue posible guardar el corte inhouse" },
      { status: 500 },
    );
  }
}
