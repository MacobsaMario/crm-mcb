import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { payrollSnapshots } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { resolveCRMUser } from "../../access-control";

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!user.canManagePayroll)
    return Response.json({ snapshots: [] });
  try {
    return Response.json({
      snapshots: await getDb()
        .select()
        .from(payrollSnapshots)
        .orderBy(desc(payrollSnapshots.reportMonth), desc(payrollSnapshots.id))
        .limit(60),
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
  if (!user.canManagePayroll)
    return Response.json(
      { error: `Su rol (${user.role}) no puede modificar Talento y Nómina` },
      { status: 403 },
    );
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const reportMonth = String(p.reportMonth ?? "").trim();
    const source = String(p.source ?? "").trim();
    if (!reportMonth || !source)
      return Response.json(
        { error: "Complete mes y fuente" },
        { status: 400 },
      );
    const count = (value: unknown) => Math.max(0, Math.trunc(Number(value) || 0));
    const cents = (value: unknown) => Math.max(0, Math.round((Number(value) || 0) * 100));
    const [snapshot] = await getDb()
      .insert(payrollSnapshots)
      .values({
        reportMonth,
        headcount: count(p.headcount),
        basePayrollCents: cents(p.basePayroll),
        employerCostCents: cents(p.employerCost),
        newHires: count(p.newHires),
        exits: count(p.exits),
        source,
        note: String(p.note ?? "").trim(),
        submittedBy: user.email,
      })
      .returning();
    return Response.json({ snapshot }, { status: 201 });
  } catch {
    return Response.json(
      { error: "No fue posible guardar el corte de nómina" },
      { status: 500 },
    );
  }
}
