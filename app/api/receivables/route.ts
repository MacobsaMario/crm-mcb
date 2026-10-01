import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import {
  collectionUpdates,
  receivableSnapshots,
} from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

const statuses = new Set([
  "Pendiente",
  "Cobro parcial",
  "Cobrado",
  "Reprogramado",
  "Escalado",
]);

const cents = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : -1;
};

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user))
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const db = getDb();
    const [snapshots, collections] = await Promise.all([
      db
        .select()
        .from(receivableSnapshots)
        .orderBy(desc(receivableSnapshots.reportDate), desc(receivableSnapshots.id))
        .limit(90),
      db
        .select()
        .from(collectionUpdates)
        .orderBy(desc(collectionUpdates.reportDate), desc(collectionUpdates.id))
        .limit(250),
    ]);
    return Response.json({ snapshots, collections });
  } catch {
    return Response.json({ snapshots: [], collections: [] });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!user.canManageReceivables)
    return Response.json(
      { error: `Su rol (${user.role}) no puede modificar Cuentas por cobrar` },
      { status: 403 },
    );
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const kind = String(p.kind ?? "");
    const reportDate = String(p.reportDate ?? "").trim();
    const responsible = String(p.responsible ?? "").trim();
    const source = String(p.source ?? "").trim();
    if (!reportDate || !responsible || !source)
      return Response.json(
        { error: "Complete fecha, responsable y fuente o evidencia" },
        { status: 400 },
      );

    if (kind === "snapshot") {
      const portfolioTotalCents = cents(p.portfolioTotal);
      const contractualOverdueCents = cents(p.contractualOverdue);
      const collectedTodayCents = cents(p.collectedToday);
      const newBillingCents = cents(p.newBilling);
      const confirmedPendingCents = cents(p.confirmedPending);
      const projectedPortfolioCents = cents(p.projectedPortfolio);
      const reimbursementsOverdueCents = cents(p.reimbursementsOverdue);
      const over90Cents = cents(p.over90);
      if (
        [
          portfolioTotalCents,
          contractualOverdueCents,
          collectedTodayCents,
          newBillingCents,
          confirmedPendingCents,
          projectedPortfolioCents,
          reimbursementsOverdueCents,
          over90Cents,
        ].some((value) => value < 0)
      )
        return Response.json(
          { error: "Los valores deben ser números iguales o mayores a cero" },
          { status: 400 },
        );
      const [snapshot] = await getDb()
        .insert(receivableSnapshots)
        .values({
          reportDate,
          portfolioTotalCents,
          contractualOverdueCents,
          collectedTodayCents,
          newBillingCents,
          confirmedPendingCents,
          projectedPortfolioCents,
          reimbursementsOverdueCents,
          over90Cents,
          responsible,
          source,
          note: String(p.note ?? "").trim(),
          submittedBy: user.email,
        })
        .returning();
      return Response.json({ snapshot }, { status: 201 });
    }

    if (kind === "collection") {
      const client = String(p.client ?? "").trim();
      const status = String(p.status ?? "");
      const nextAction = String(p.nextAction ?? "").trim();
      const committedCents = cents(p.committed);
      const collectedCents = cents(p.collected);
      const pendingCents = cents(p.pending);
      if (!client || !statuses.has(status) || !nextAction)
        return Response.json(
          { error: "Complete cliente, estado y próxima acción" },
          { status: 400 },
        );
      if ([committedCents, collectedCents, pendingCents].some((value) => value < 0))
        return Response.json(
          { error: "Los valores deben ser números iguales o mayores a cero" },
          { status: 400 },
        );
      const [collection] = await getDb()
        .insert(collectionUpdates)
        .values({
          reportDate,
          client,
          committedCents,
          collectedCents,
          pendingCents,
          status,
          responsible,
          commitmentDate: String(p.commitmentDate ?? "").trim(),
          nextAction,
          source,
          submittedBy: user.email,
        })
        .returning();
      return Response.json({ collection }, { status: 201 });
    }

    return Response.json({ error: "Tipo de registro inválido" }, { status: 400 });
  } catch {
    return Response.json(
      { error: "No fue posible guardar la actualización de cartera" },
      { status: 500 },
    );
  }
}
