import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb, runBatch } from "@macobsa-db";
import { grupoUneOperations } from "@macobsa-schema";
import seedOperations from "../../data/grupo-une-operations.json";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

export const dynamic = "force-dynamic";

type SeedRow = Record<string, string | number | null>;
const text = (value: unknown, max = 1200) => String(value ?? "").trim().slice(0, max);
const date = (value: unknown) => { const valueText = text(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : null; };
const number = (value: unknown) => { const parsed = Number(value); return value === null || value === "" || !Number.isFinite(parsed) ? null : Math.round(parsed); };
const compliance = (value: unknown) => ["CUMPLE", "NO CUMPLE"].includes(text(value).toUpperCase()) ? text(value).toUpperCase() : "PENDIENTE";
function businessDayDifference(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || last < first) return null;
  let days = 0;
  for (let time = first.getTime() + 86400000; time <= last.getTime(); time += 86400000) {
    const weekday = new Date(time).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

async function ensureSeeded() {
  const db = getDb();
  const [{ value }] = await db.select({ value: count() }).from(grupoUneOperations);
  if (value > 0) return;
  const rows = (seedOperations as SeedRow[]).map((row) => ({
    company: text(row.company) || "ECUABARNICES",
    purchaseOrder: text(row.purchase_order),
    customsReference: text(row.customs_reference),
    supplier: text(row.supplier, 300),
    product: text(row.product, 500),
    status: text(row.status) || "PLANIFICADO",
    etd: date(row.etd),
    eta: date(row.eta),
    warehouseReceiptDate: date(row.warehouse_receipt_date),
    incoterm: text(row.incoterm),
    originCountry: text(row.origin_country),
    loadingPort: text(row.loading_port),
    arrivalPort: text(row.arrival_port),
    transitDays: number(row.transit_days),
    etaToWarehouseDays: number(row.eta_to_warehouse_days),
    warehouseToSapDays: number(row.warehouse_to_sap_days),
    etaToSapDays: number(row.eta_to_sap_days),
    ocCompliance: "PENDIENTE",
    ocComplianceNotes: "",
    notes: text(row.notes),
    source: "Plantilla TRÁNSITO ECUABARNICES",
    submittedBy: "mario@mariocoka.com",
  }));
  for (let start = 0; start < rows.length; start += 40) {
    await runBatch((database) =>
      rows.slice(start, start + 40).map((row) =>
        database.insert(grupoUneOperations).values(row).onConflictDoNothing(),
      ),
    );
  }
}

async function authorizedUser() {
  const authenticated = await getChatGPTUser();
  if (!authenticated) return null;
  const user = resolveCRMUser(authenticated);
  return isAuthorizedCRMUser(user) ? user : null;
}

export async function GET(request: Request) {
  const user = await authorizedUser();
  if (!user) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  await ensureSeeded();
  const url = new URL(request.url);
  const query = text(url.searchParams.get("q"), 120);
  const company = text(url.searchParams.get("company"), 80);
  const status = text(url.searchParams.get("status"), 40);
  const month = /^\d{4}-\d{2}$/.test(text(url.searchParams.get("month"), 7)) ? text(url.searchParams.get("month"), 7) : "";
  const conditions = [];
  if (query) conditions.push(or(like(grupoUneOperations.purchaseOrder, `%${query}%`), like(grupoUneOperations.customsReference, `%${query}%`), like(grupoUneOperations.supplier, `%${query}%`), like(grupoUneOperations.product, `%${query}%`), like(grupoUneOperations.notes, `%${query}%`))!);
  if (company === "FADESA GYE") conditions.push(inArray(grupoUneOperations.company, ["FADESA GYE", "FADESA"]));
  else if (company === "FADESA MANTA") conditions.push(inArray(grupoUneOperations.company, ["FADESA MANTA", "FADESA Manta"]));
  else if (company) conditions.push(eq(grupoUneOperations.company, company));
  if (status) conditions.push(eq(grupoUneOperations.status, status));
  if (month) conditions.push(like(grupoUneOperations.eta, `${month}-%`));
  const operations = await getDb().select().from(grupoUneOperations).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(grupoUneOperations.updatedAt), asc(grupoUneOperations.id)).limit(600);
  const allMonths = await getDb().select({ eta: grupoUneOperations.eta }).from(grupoUneOperations);
  const months = [...new Set(allMonths.map((row) => row.eta?.slice(0, 7)).filter((value): value is string => Boolean(value && /^\d{4}-\d{2}$/.test(value))))].sort().reverse();
  return Response.json({ operations, months, canManage: user.canWrite && user.role !== "Soporte IT" });
}

export async function POST(request: Request) {
  const user = await authorizedUser();
  if (!user) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  if (!user.canWrite || user.role === "Soporte IT") return Response.json({ error: "Su perfil es únicamente de consulta" }, { status: 403 });
  const payload = await request.json() as Record<string, unknown>;
  const action = text(payload.action, 30);
  if (action === "import") {
    const source = text(payload.source, 180);
    const rows = Array.isArray(payload.operations) ? payload.operations as Record<string, unknown>[] : [];
    if (!source || rows.length < 1 || rows.length > 1000) return Response.json({ error: "El archivo no contiene operaciones válidas para cargar." }, { status: 400 });
    const allowedCompanies = new Set(["ECUABARNICES", "FADESA GYE", "FADESA MANTA", "FADESA", "FADESA Manta"]);
    const unique = new Map<string, Record<string, unknown>>();
    let duplicatesInFile = 0;
    for (const row of rows) {
      const company = text(row.company, 80);
      const purchaseOrder = text(row.purchaseOrder, 160);
      if (!allowedCompanies.has(company) || !purchaseOrder) continue;
      const key = `${company.toUpperCase()}|${purchaseOrder.toUpperCase()}`;
      if (unique.has(key)) { duplicatesInFile += 1; continue; }
      unique.set(key, row);
    }
    if (!unique.size) return Response.json({ error: "No se encontraron órdenes de compra con empresa reconocida." }, { status: 400 });
    const importedRows = [...unique.values()].map((row) => {
      const etd = date(row.etd); const eta = date(row.eta); const receipt = date(row.warehouseReceiptDate); const sap = date(row.sapEntryDate);
      const transitDays = etd && eta ? Math.max(0, Math.round((Date.parse(`${eta}T00:00:00Z`) - Date.parse(`${etd}T00:00:00Z`)) / 86400000)) : null;
      return {
        company: text(row.company, 80), purchaseOrder: text(row.purchaseOrder, 160), customsReference: text(row.customsReference, 160),
        supplier: text(row.supplier, 300), product: text(row.product, 500), status: text(row.status, 40) || "TRAMITADO",
        etd, eta, warehouseReceiptDate: receipt, sapEntryDate: sap, incoterm: text(row.incoterm, 40),
        originCountry: text(row.originCountry, 100), loadingPort: text(row.loadingPort, 100), arrivalPort: text(row.arrivalPort, 100),
        transitDays, etaToWarehouseDays: businessDayDifference(eta, receipt), warehouseToSapDays: businessDayDifference(receipt, sap),
        etaToSapDays: businessDayDifference(eta, sap), cxpSentDate: date(row.cxpSentDate) || "", cxpRegisteredDate: date(row.cxpRegisteredDate) || "",
        notes: text(row.notes, 4000), source, submittedBy: user.email, ocCompliance: "PENDIENTE", ocComplianceNotes: "",
      };
    });
    const existing = await getDb().select({ company: grupoUneOperations.company, purchaseOrder: grupoUneOperations.purchaseOrder })
      .from(grupoUneOperations).where(inArray(grupoUneOperations.purchaseOrder, [...new Set(importedRows.map((row) => row.purchaseOrder))]));
    const existingKeys = new Set(existing.map((row) => `${row.company.toUpperCase()}|${row.purchaseOrder.toUpperCase()}`));
    const pending = importedRows.filter((row) => !existingKeys.has(`${row.company.toUpperCase()}|${row.purchaseOrder.toUpperCase()}`));
    for (let start = 0; start < pending.length; start += 40) {
      await runBatch((database) =>
        pending.slice(start, start + 40).map((row) =>
          database.insert(grupoUneOperations).values(row).onConflictDoNothing(),
        ),
      );
    }
    return Response.json({ imported: pending.length, skippedExisting: importedRows.length - pending.length, duplicatesInFile, received: rows.length, source });
  }
  const ocCompliance = compliance(payload.ocCompliance);
  const ocComplianceNotes = text(payload.ocComplianceNotes, 800);
  if (ocCompliance === "NO CUMPLE" && !ocComplianceNotes) return Response.json({ error: "La observación es obligatoria cuando la OC no cumple." }, { status: 400 });
  const values = {
    company: text(payload.company, 80) || "ECUABARNICES",
    purchaseOrder: text(payload.purchaseOrder, 160),
    customsReference: text(payload.customsReference, 160),
    supplier: text(payload.supplier, 300),
    product: text(payload.product, 500),
    status: text(payload.status, 40) || "PLANIFICADO",
    etd: date(payload.etd),
    eta: date(payload.eta),
    warehouseReceiptDate: date(payload.warehouseReceiptDate),
    sapEntryDate: date(payload.sapEntryDate),
    noticeDate: date(payload.noticeDate) || "",
    ocCreationDate: date(payload.ocCreationDate) || "",
    valueQuantitySentDate: date(payload.valueQuantitySentDate) || "",
    ocBalancedDate: date(payload.ocBalancedDate) || "",
    ocRetentionNoticeDate: date(payload.ocRetentionNoticeDate) || "",
    ocReleaseDate: date(payload.ocReleaseDate) || "",
    approval1Date: date(payload.approval1Date) || "",
    approval2Date: date(payload.approval2Date) || "",
    approval3Date: date(payload.approval3Date) || "",
    cxpSentDate: date(payload.cxpSentDate) || "",
    cxpRegisteredDate: date(payload.cxpRegisteredDate) || "",
    warehouseEntryRequestedDate: date(payload.warehouseEntryRequestedDate) || "",
    storageCostCents: Math.max(0, Math.round((Number(payload.storageCostUsd) || 0) * 100)),
    weightKg: Math.max(0, Math.round(Number(payload.weightKg) || 0)),
    valuesRequestedDate: date(payload.valuesRequestedDate) || "",
    arrivalDate: date(payload.arrivalDate) || "",
    macobsaPaymentDate: date(payload.macobsaPaymentDate) || "",
    transportMode: text(payload.transportMode, 30).toUpperCase(),
    documentsReceivedAt: text(payload.documentsReceivedAt, 30),
    documentsSentExecutiveAt: text(payload.documentsSentExecutiveAt, 30),
    incoterm: text(payload.incoterm, 40),
    originCountry: text(payload.originCountry, 100),
    loadingPort: text(payload.loadingPort, 100),
    arrivalPort: text(payload.arrivalPort, 100),
    etaToWarehouseDays: number(payload.etaToWarehouseDays),
    warehouseToSapDays: number(payload.warehouseToSapDays),
    etaToSapDays: number(payload.etaToSapDays),
    ocCompliance,
    ocComplianceNotes,
    notes: text(payload.notes),
    source: "Registro CRM MACOBSA",
    submittedBy: user.email,
    updatedAt: new Date().toISOString(),
  };
  if (action === "create") {
    if (!values.purchaseOrder) return Response.json({ error: "La orden de compra es obligatoria" }, { status: 400 });
    const [operation] = await getDb().insert(grupoUneOperations).values(values).returning();
    return Response.json({ operation }, { status: 201 });
  }
  if (action === "update") {
    const id = Number(payload.id);
    if (!id) return Response.json({ error: "Operación inválida" }, { status: 400 });
    const { purchaseOrder: _purchaseOrder, company: _company, ...updates } = values;
    await getDb().update(grupoUneOperations).set(updates).where(eq(grupoUneOperations.id, id));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Acción no reconocida" }, { status: 400 });
}
