import { unzipSync, strFromU8 } from "fflate";
import { extractText as extractPdfText } from "unpdf";
import { decodeWordDocumentXml } from "../../../../regulatory-parser";
import { processStoredReport, REPORT_PARSER_VERSION, type ProcessingDecision } from "../../../../report-processing";
import { auditHeaders, getAuditD1, getAuditR2, requireAuditOwner, sha256 } from "../../_shared";

export const dynamic = "force-dynamic";

const EXPECTED_LEGACY_REPORTS = 26;
const EXECUTION_CONFIRMATION = "PROCESS-26-LEGACY-V57";

type LegacyReport = {
  id: number;
  area: string;
  report_date: string;
  responsible: string;
  original_name: string;
  object_key: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string;
  submitted_by: string;
};

type Verification = {
  exists: boolean;
  readable: boolean;
  sizeMatches: boolean;
  bytesRead: number;
  sha256: string;
  status: "PASS" | "MISSING" | "READ_ERROR" | "SIZE_MISMATCH";
};

export async function GET() {
  const denied = await requireAuditOwner();
  if (denied) return denied;
  try {
    const database = getAuditD1();
    const result = await database.prepare(`
      SELECT processing_status AS status, COUNT(*) AS total
      FROM daily_report_uploads
      GROUP BY processing_status
      ORDER BY processing_status
    `).all<{ status: string; total: number }>();
    if (!result.success) throw new Error("Processing status read failed");
    return Response.json({ expectedLegacyReports: EXPECTED_LEGACY_REPORTS, counts: result.results ?? [] }, { headers: auditHeaders() });
  } catch (error) {
    console.error("Legacy processing status failed", error);
    return Response.json({ error: "No fue posible consultar el procesamiento legacy" }, { status: 503, headers: auditHeaders() });
  }
}

export async function POST(request: Request) {
  const denied = await requireAuditOwner();
  if (denied) return denied;
  let body: { mode?: string; expectedCount?: number; confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Solicitud no válida" }, { status: 400, headers: auditHeaders() });
  }
  const execute = body.mode === "execute";
  if (!execute && body.mode !== "dry-run") {
    return Response.json({ error: "Modo no válido" }, { status: 400, headers: auditHeaders() });
  }
  if (body.expectedCount !== EXPECTED_LEGACY_REPORTS) {
    return Response.json({ error: `El control exige exactamente ${EXPECTED_LEGACY_REPORTS} informes.` }, { status: 409, headers: auditHeaders() });
  }
  if (execute && body.confirmation !== EXECUTION_CONFIRMATION) {
    return Response.json({ error: "Confirmación de procesamiento no válida" }, { status: 409, headers: auditHeaders() });
  }

  try {
    const database = getAuditD1();
    const bucket = getAuditR2();
    const reportsResult = await database.prepare(`
      SELECT id, area, report_date, responsible, original_name, object_key,
             mime_type, size_bytes, extracted_text, submitted_by
      FROM daily_report_uploads
      WHERE processing_status = 'legacy'
      ORDER BY id
    `).all<LegacyReport>();
    if (!reportsResult.success) throw new Error("Legacy report read failed");
    const reports = reportsResult.results ?? [];
    if (reports.length !== EXPECTED_LEGACY_REPORTS) {
      return Response.json({
        error: `Control detenido: se esperaban ${EXPECTED_LEGACY_REPORTS} informes legacy y se encontraron ${reports.length}.`,
        found: reports.length,
      }, { status: 409, headers: auditHeaders() });
    }

    const results = [];
    for (const report of reports) {
      let verification: Verification = { exists: false, readable: false, sizeMatches: false, bytesRead: 0, sha256: "", status: "MISSING" };
      let extractedText = report.extracted_text;
      try {
        const object = await bucket.get(report.object_key);
        if (object) {
          const bytes = await object.arrayBuffer();
          const bytesRead = bytes.byteLength;
          const sizeMatches = bytesRead === report.size_bytes;
          verification = {
            exists: true,
            readable: true,
            sizeMatches,
            bytesRead,
            sha256: await sha256(bytes),
            status: sizeMatches ? "PASS" : "SIZE_MISMATCH",
          };
          if (!extractedText.trim()) extractedText = await extractStoredText(bytes, report.original_name, report.mime_type);
        }
      } catch {
        verification = { exists: true, readable: false, sizeMatches: false, bytesRead: 0, sha256: "", status: "READ_ERROR" };
      }

      const decision = processStoredReport(report.area, extractedText);
      const processingError = [
        ...decision.warnings,
        ...(verification.status === "PASS" ? [] : [`R2 ${verification.status}; disponible mediante evidencia textual cuando exista.`]),
      ].join(" ");
      const resultPayload = { reportId: report.id, area: report.area, decision, r2: verification };

      if (execute) {
        const statements: D1PreparedStatement[] = [];
        const snapshot = snapshotStatement(database, report, decision);
        if (snapshot) statements.push(snapshot);
        if (!report.extracted_text.trim() && extractedText.trim()) {
          statements.push(database.prepare(`UPDATE daily_report_uploads SET extracted_text = ? WHERE id = ?`).bind(extractedText.slice(0, 40000), report.id));
        }
        statements.push(database.prepare(`
          UPDATE daily_report_uploads
          SET source_evidence = ?, next_action = ?, commitment_date = ?,
              processing_status = ?, processed_at = CURRENT_TIMESTAMP,
              processing_error = ?, parser_version = ?, content_sha256 = ?,
              processing_token = NULL, processing_started_at = NULL
          WHERE id = ? AND processing_status = 'legacy'
        `).bind(
          report.original_name,
          decision.nextAction,
          report.report_date,
          decision.status,
          processingError,
          REPORT_PARSER_VERSION,
          verification.sha256 || await sha256(extractedText),
          report.id,
        ));
        statements.push(database.prepare(`
          INSERT INTO report_processing_runs
            (report_id, parser_version, status, error, result_json, attempted_by, is_reprocess)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).bind(
          report.id,
          REPORT_PARSER_VERSION,
          decision.status,
          processingError,
          JSON.stringify(resultPayload),
          "k2v5nc8k7s@privaterelay.appleid.com",
        ));
        statements.push(database.prepare(`
          UPDATE department_updates
          SET status = ?
          WHERE area = ? AND responsible = ? AND report_date = ?
        `).bind(uiStatus(decision.status), report.area, report.responsible, report.report_date));
        const batch = await database.batch(statements);
        if (batch.some((item) => !item.success)) throw new Error(`Batch failed for report ${report.id}`);
      }
      results.push(resultPayload);
    }

    const processed = results.filter((item) => item.decision.status === "processed" || item.decision.status === "processed_documental").length;
    const partial = results.filter((item) => item.decision.status === "partial").length;
    const failed = results.filter((item) => item.decision.status === "failed").length;
    const r2Passed = results.filter((item) => item.r2.status === "PASS").length;
    return Response.json({
      mode: body.mode,
      parserVersion: REPORT_PARSER_VERSION,
      expected: EXPECTED_LEGACY_REPORTS,
      processed,
      partial,
      failed,
      r2Passed,
      r2Fallbacks: EXPECTED_LEGACY_REPORTS - r2Passed,
      results,
    }, { headers: auditHeaders() });
  } catch (error) {
    console.error("Controlled legacy processing failed", error);
    return Response.json({ error: "El procesamiento controlado se detuvo sin ejecutar correcciones adicionales." }, { status: 503, headers: auditHeaders() });
  }
}

async function extractStoredText(bytes: ArrayBuffer, originalName: string, mimeType: string) {
  const extension = originalName.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || mimeType.includes("pdf")) {
    const pdf = await extractPdfText(new Uint8Array(bytes), { mergePages: true });
    return pdf.text.slice(0, 40000);
  }
  if (extension === "docx" || mimeType.includes("wordprocessingml")) {
    const files = unzipSync(new Uint8Array(bytes));
    const documentXml = files["word/document.xml"];
    return documentXml ? decodeWordDocumentXml(strFromU8(documentXml)).slice(0, 40000) : "";
  }
  return "";
}

function snapshotStatement(database: D1Database, report: LegacyReport, decision: ProcessingDecision) {
  const analysis = decision.analysis;
  if (!analysis || decision.status === "failed") return null;
  if (report.area === "Regulatorio") return database.prepare(`
    INSERT INTO regulatory_snapshots
      (report_date, billed_today_cents, billed_accumulated_cents, monthly_goal_cents,
       created_unbilled_today_cents, created_unbilled_accumulated_cents,
       licenses_today, licenses_accumulated, calculated_progress_basis_points,
       declared_progress_basis_points, prospects_declared, warnings_json,
       responsible, source, submitted_by, source_report_id)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM regulatory_snapshots WHERE source_report_id = ?)
  `).bind(
    report.report_date, analysis.billedTodayCents, analysis.billedAccumulatedCents, analysis.monthlyGoalCents,
    analysis.createdUnbilledTodayCents, analysis.createdUnbilledAccumulatedCents,
    analysis.licensesToday, analysis.licensesAccumulated, analysis.calculatedProgressBasisPoints,
    analysis.declaredProgressBasisPoints, analysis.prospectsDeclared ? 1 : 0, JSON.stringify(analysis.warnings ?? []),
    report.responsible, report.original_name, report.submitted_by, report.id, report.id,
  );
  if (report.area === "Financiero") return database.prepare(`
    INSERT INTO financial_snapshots
      (report_date, accounting_portfolio_cents, effective_collections_cents, new_billing_cents,
       confirmed_pending_cents, overdue_pending_cents, projected_portfolio_cents,
       base_portfolio_cents, additional_potential_cents, report_date_label, warnings_json,
       responsible, source, submitted_by, source_report_id)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM financial_snapshots WHERE source_report_id = ?)
  `).bind(
    report.report_date, analysis.accountingPortfolioCents, analysis.effectiveCollectionsCents, analysis.newBillingCents,
    analysis.confirmedPendingCents, analysis.overduePendingCents, analysis.projectedPortfolioCents,
    analysis.basePortfolioCents, analysis.additionalPotentialCents, analysis.reportDateLabel ?? "", JSON.stringify(analysis.warnings ?? []),
    report.responsible, report.original_name, report.submitted_by, report.id, report.id,
  );
  if (report.area === "Comercial") return database.prepare(`
    INSERT INTO commercial_snapshots
      (report_date, billed_today_cents, billed_accumulated_cents, monthly_goal_cents,
       orders_today, orders_accumulated, orders_goal, new_clients_today,
       new_clients_accumulated, active_tenders, won_tenders, calculated_progress_basis_points,
       responsible, source, submitted_by, source_report_id)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM commercial_snapshots WHERE source_report_id = ?)
  `).bind(
    report.report_date, analysis.billedTodayCents, analysis.billedAccumulatedCents, analysis.monthlyGoalCents,
    analysis.ordersToday, analysis.ordersAccumulated, analysis.ordersGoal, analysis.newClientsToday,
    analysis.newClientsAccumulated, analysis.activeTenders, analysis.wonTenders, analysis.calculatedProgressBasisPoints,
    report.responsible, report.original_name, report.submitted_by, report.id, report.id,
  );
  if (report.area === "Facturación") return database.prepare(`
    INSERT INTO billing_snapshots
      (report_date, dai_accumulated_cents, regulatory_accumulated_cents, extras_accumulated_cents,
       invoiced_today_cents, invoices_today, ready_to_invoice, completed_pending, blocked,
       responsible, source, note, submitted_by)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM billing_snapshots WHERE report_date = ? AND responsible = ? AND source = ?
    )
  `).bind(
    report.report_date, analysis.daiAccumulatedCents, analysis.regulatoryAccumulatedCents, analysis.extrasAccumulatedCents,
    analysis.invoicedTodayCents, analysis.invoicesToday, analysis.readyToInvoice, analysis.completedPending, analysis.blocked,
    report.responsible, report.original_name, analysis.note ?? "", report.submitted_by,
    report.report_date, report.responsible, report.original_name,
  );
  if (report.area === "Despacho" && decision.status === "processed") return database.prepare(`
    INSERT INTO dispatch_snapshots
      (report_date, references_live, high_risk, ready_to_invoice, compliance_basis_points,
       group_wong_pending, ecuasigad_status, responsible, next_action, source, note, submitted_by)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM dispatch_snapshots WHERE report_date = ? AND responsible = ? AND source = ?
    )
  `).bind(
    report.report_date, analysis.referencesLive, analysis.highRisk, analysis.readyToInvoice, analysis.complianceBasisPoints,
    analysis.groupWongPending, analysis.ecuasigadStatus, report.responsible, analysis.nextAction,
    report.original_name, analysis.note ?? "", report.submitted_by,
    report.report_date, report.responsible, report.original_name,
  );
  if (report.area === "Inhouse El Rosado" && decision.status === "processed") return database.prepare(`
    INSERT INTO inhouse_snapshots
      (report_date, client, dav_pending, urgent_dav, ready_for_pickup, checklist_pending,
       storage_alerts, responsible, next_action, source, note, submitted_by)
    SELECT ?, 'Corporación El Rosado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM inhouse_snapshots WHERE report_date = ? AND responsible = ? AND source = ?
    )
  `).bind(
    report.report_date, analysis.davPending, analysis.urgentDav, analysis.readyForPickup,
    analysis.checklistPending, analysis.storageAlerts, report.responsible, analysis.nextAction,
    report.original_name, analysis.note ?? "", report.submitted_by,
    report.report_date, report.responsible, report.original_name,
  );
  return null;
}

function uiStatus(status: ProcessingDecision["status"]) {
  if (status === "processed") return "Procesado automáticamente";
  if (status === "processed_documental") return "Procesado documental";
  if (status === "partial") return "Procesado parcial · revisión interna";
  return "Requiere revisión interna";
}
