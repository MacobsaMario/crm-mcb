import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { dispatchSnapshots } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    return Response.json({ snapshots: await getDb().select().from(dispatchSnapshots).orderBy(desc(dispatchSnapshots.reportDate), desc(dispatchSnapshots.id)).limit(100) });
  } catch {
    return Response.json({ snapshots: [] });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!user.canManageDispatch) return Response.json({ error: `Su rol (${user.role}) no puede modificar Despacho diario` }, { status: 403 });
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const reportDate = String(p.reportDate ?? "").trim();
    const responsible = String(p.responsible ?? "").trim();
    const nextAction = String(p.nextAction ?? "").trim();
    const source = String(p.source ?? "").trim();
    const ecuasigadStatus = String(p.ecuasigadStatus ?? "").trim();
    if (!reportDate || !responsible || !nextAction || !source || !ecuasigadStatus)
      return Response.json({ error: "Complete fecha, responsable, estado ECUASIGAD, próxima acción y fuente" }, { status: 400 });
    const count = (value: unknown) => Math.max(0, Math.trunc(Number(value) || 0));
    const percent = Math.min(100, Math.max(0, Number(p.compliancePercent) || 0));
    const [snapshot] = await getDb().insert(dispatchSnapshots).values({
      reportDate,
      referencesLive: count(p.referencesLive),
      highRisk: count(p.highRisk),
      readyToInvoice: count(p.readyToInvoice),
      complianceBasisPoints: Math.round(percent * 100),
      groupWongPending: count(p.groupWongPending),
      ecuasigadStatus,
      responsible,
      nextAction,
      source,
      note: String(p.note ?? "").trim(),
      submittedBy: user.email,
    }).returning();
    return Response.json({ snapshot }, { status: 201 });
  } catch {
    return Response.json({ error: "No fue posible guardar el corte de Despacho" }, { status: 500 });
  }
}
