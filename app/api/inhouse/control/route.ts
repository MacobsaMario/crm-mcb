import { asc, isNull, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@macobsa-db";
import { elRosadoOperations } from "@macobsa-schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../../access-control";

export const dynamic = "force-dynamic";

const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const date = (value: unknown) => {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
};
const key = (value: unknown) => text(value, 140).replace(/\s+/g, " ").toUpperCase();

type IncomingRow = Record<string, unknown>;

function cleanRow(row: IncomingRow, source: string, submittedBy: string) {
  const operation = text(row.operation, 140).replace(/\s+/g, " ");
  const operationKey = key(operation);
  if (!operationKey) return null;
  return {
    operationKey,
    operation,
    society: text(row.society, 120) || "Corp El Rosado",
    supplier: text(row.supplier, 300),
    responsible: text(row.responsible, 160),
    receivedAt: date(row.receivedAt),
    checklistAt: date(row.checklistAt),
    davSentAt: date(row.davSentAt),
    arrivalAt: date(row.arrivalAt),
    davApprovedAt: date(row.davApprovedAt),
    transmittedAt: date(row.transmittedAt),
    authorizedExitAt: date(row.authorizedExitAt),
    pickupAt: date(row.pickupAt),
    ecasExpiresAt: date(row.ecasExpiresAt),
    containers: text(row.containers, 120),
    customsStatus: text(row.customsStatus, 200),
    observations: text(row.observations, 1500),
    documentsCompleteAt: date(row.documentsCompleteAt),
    delivered: Boolean(row.delivered),
    source,
    submittedBy,
    archivedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const authenticated = await getChatGPTUser();
  if (!authenticated) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  const user = resolveCRMUser(authenticated);
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const operations = await getDb()
      .select()
      .from(elRosadoOperations)
      .where(isNull(elRosadoOperations.archivedAt))
      .orderBy(asc(elRosadoOperations.arrivalAt), asc(elRosadoOperations.operation));
    return Response.json({ operations, canManage: user.canManageInhouse });
  } catch {
    return Response.json({ operations: [], canManage: user.canManageInhouse });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const suppliedImportSecret = text(request.headers.get("x-macobsa-import-secret"), 240);
  const configuredImportSecret = text(
    (env as unknown as Record<string, unknown>).MACOBSA_IMPORT_SECRET,
    240,
  );
  const serviceImport = Boolean(
    configuredImportSecret && suppliedImportSecret === configuredImportSecret,
  );
  const user = authenticated
    ? resolveCRMUser(authenticated)
    : serviceImport
      ? resolveCRMUser({
          displayName: "Importación segura MACOBSA",
          email: "mario@mariocoka.com",
          fullName: "Mario Coka",
        })
      : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!user.canManageInhouse)
    return Response.json({ error: `Su rol (${user.role}) no puede modificar este control` }, { status: 403 });

  try {
    const body = (await request.json()) as { rows?: IncomingRow[]; source?: unknown };
    if (!Array.isArray(body.rows) || body.rows.length === 0)
      return Response.json({ error: "El archivo no contiene trámites válidos" }, { status: 400 });
    if (body.rows.length > 2500)
      return Response.json({ error: "El archivo supera el máximo de 2.500 filas por carga" }, { status: 400 });

    const source = text(body.source, 240) || "Actualización de Excel";
    const incoming = body.rows
      .map((row) => cleanRow(row, source, user.email))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const unique = new Map(incoming.map((row) => [row.operationKey, row]));
    const cleaned = [...unique.values()];
    if (!cleaned.length)
      return Response.json({ error: "No se encontró una columna de operación válida" }, { status: 400 });

    const db = getDb();
    const previous = await db.select().from(elRosadoOperations);
    const previousByKey = new Map(previous.map((row) => [row.operationKey, row]));
    const keep = (next: string, current: string | null | undefined) => next || current || "";
    const merged = cleaned.map((row) => {
      const current = previousByKey.get(row.operationKey);
      if (!current) return row;
      return {
        ...row,
        society: keep(row.society, current.society),
        supplier: keep(row.supplier, current.supplier),
        responsible: keep(row.responsible, current.responsible),
        receivedAt: keep(row.receivedAt, current.receivedAt),
        checklistAt: keep(row.checklistAt, current.checklistAt),
        davSentAt: keep(row.davSentAt, current.davSentAt),
        arrivalAt: keep(row.arrivalAt, current.arrivalAt),
        davApprovedAt: keep(row.davApprovedAt, current.davApprovedAt),
        transmittedAt: keep(row.transmittedAt, current.transmittedAt),
        authorizedExitAt: keep(row.authorizedExitAt, current.authorizedExitAt),
        pickupAt: keep(row.pickupAt, current.pickupAt),
        ecasExpiresAt: keep(row.ecasExpiresAt, current.ecasExpiresAt),
        containers: keep(row.containers, current.containers),
        customsStatus: keep(row.customsStatus, current.customsStatus),
        observations: keep(row.observations, current.observations),
        documentsCompleteAt: keep(row.documentsCompleteAt, current.documentsCompleteAt),
        delivered: row.delivered || current.delivered,
      };
    });

    await db.insert(elRosadoOperations).values(merged).onConflictDoUpdate({
      target: elRosadoOperations.operationKey,
      set: {
        operation: sql`excluded.operation`,
        society: sql`excluded.society`,
        supplier: sql`excluded.supplier`,
        responsible: sql`excluded.responsible`,
        receivedAt: sql`excluded.received_at`,
        checklistAt: sql`excluded.checklist_at`,
        davSentAt: sql`excluded.dav_sent_at`,
        arrivalAt: sql`excluded.arrival_at`,
        davApprovedAt: sql`excluded.dav_approved_at`,
        transmittedAt: sql`excluded.transmitted_at`,
        authorizedExitAt: sql`excluded.authorized_exit_at`,
        pickupAt: sql`excluded.pickup_at`,
        ecasExpiresAt: sql`excluded.ecas_expires_at`,
        containers: sql`excluded.containers`,
        customsStatus: sql`excluded.customs_status`,
        observations: sql`excluded.observations`,
        documentsCompleteAt: sql`excluded.documents_complete_at`,
        delivered: sql`excluded.delivered`,
        source: sql`excluded.source`,
        submittedBy: sql`excluded.submitted_by`,
        archivedAt: null,
        updatedAt: sql`excluded.updated_at`,
      },
    });

    return Response.json({
      imported: merged.length,
      created: merged.filter((row) => !previousByKey.has(row.operationKey)).length,
      updated: merged.filter((row) => previousByKey.has(row.operationKey)).length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No fue posible actualizar el control" },
      { status: 500 },
    );
  }
}
