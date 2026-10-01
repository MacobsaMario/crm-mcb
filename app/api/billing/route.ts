import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { billingSnapshots } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

export async function GET() {
  const authenticated = await getChatGPTUser();
  if (!authenticated) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(resolveCRMUser(authenticated))) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    return Response.json({ snapshots: await getDb().select().from(billingSnapshots).orderBy(desc(billingSnapshots.reportDate), desc(billingSnapshots.id)).limit(100) });
  } catch {
    return Response.json({ snapshots: [] });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!user.canManageBilling) return Response.json({ error: `Su rol (${user.role}) no puede modificar Facturación diaria` }, { status: 403 });
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const reportDate = String(p.reportDate ?? "").trim();
    const responsible = String(p.responsible ?? "").trim();
    const source = String(p.source ?? "").trim();
    if (!reportDate || !responsible || !source) return Response.json({ error: "Complete fecha, responsable y fuente" }, { status: 400 });
    const cents = (value: unknown) => Math.max(0, Math.round((Number(value) || 0) * 100));
    const count = (value: unknown) => Math.max(0, Math.trunc(Number(value) || 0));
    const optionalCount = (value: unknown) => value === "" || value == null ? null : count(value);
    const [snapshot] = await getDb().insert(billingSnapshots).values({
      reportDate,
      daiAccumulatedCents: cents(p.daiAccumulated),
      regulatoryAccumulatedCents: cents(p.regulatoryAccumulated),
      extrasAccumulatedCents: cents(p.extrasAccumulated),
      invoicedTodayCents: cents(p.invoicedToday),
      invoicesToday: count(p.invoicesToday),
      readyToInvoice: optionalCount(p.readyToInvoice),
      completedPending: optionalCount(p.completedPending),
      blocked: optionalCount(p.blocked),
      responsible,
      source,
      note: String(p.note ?? "").trim(),
      submittedBy: user.email,
    }).returning();
    return Response.json({ snapshot }, { status: 201 });
  } catch {
    return Response.json({ error: "No fue posible guardar el corte de facturación" }, { status: 500 });
  }
}
