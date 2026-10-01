import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  client: text("client").notNull(),
  title: text("title").notNull(),
  value: integer("value").notNull().default(0),
  stage: text("stage").notNull().default("Calificación"),
  owner: text("owner").notNull(),
  nextAction: text("next_action").notNull().default(""),
  dueDate: text("due_date").notNull().default(""),
  source: text("source").notNull().default("Registro del equipo"),
  submittedBy: text("submitted_by").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
export const departmentUpdates = pgTable(
  "department_updates",
  {
    id: serial("id").primaryKey(),
    area: text("area").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    metric: text("metric").notNull().default(""),
    status: text("status").notNull().default("En seguimiento"),
    responsible: text("responsible").notNull(),
    reportDate: text("report_date").notNull(),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_department_updates_area_date").on(t.area, t.reportDate)],
);

export const dailyReportUploads = pgTable(
  "daily_report_uploads",
  {
    id: serial("id").primaryKey(),
    area: text("area").notNull(),
    reportDate: text("report_date").notNull(),
    responsible: text("responsible").notNull(),
    originalName: text("original_name").notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    extractedText: text("extracted_text").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    sourceEvidence: text("source_evidence").notNull().default(""),
    nextAction: text("next_action").notNull().default(""),
    commitmentDate: text("commitment_date").notNull().default(""),
    processingStatus: text("processing_status").notNull().default("legacy"),
    processedAt: text("processed_at"),
    processingError: text("processing_error").notNull().default(""),
    parserVersion: text("parser_version").notNull().default(""),
    contentSha256: text("content_sha256").notNull().default(""),
    originType: text("origin_type").notNull().default("legacy"),
    reprocessCount: integer("reprocess_count").notNull().default(0),
    lastReprocessedAt: text("last_reprocessed_at"),
    submittedName: text("submitted_name").notNull().default(""),
    processingToken: text("processing_token"),
    processingStartedAt: text("processing_started_at"),
  },
  (t) => [
    index("idx_daily_report_uploads_area_date").on(t.area, t.reportDate),
    uniqueIndex("uq_daily_report_uploads_owner_date").on(
      t.area,
      t.responsible,
      t.reportDate,
    ),
  ],
);

export const reportCorrectionHistory = pgTable("report_correction_history", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  area: text("area").notNull(),
  reportDate: text("report_date").notNull(),
  responsible: text("responsible").notNull(),
  originalName: text("original_name").notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  extractedText: text("extracted_text").notNull().default(""),
  submittedBy: text("submitted_by").notNull(),
  createdAt: text("created_at").notNull(),
  voidedAt: text("voided_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  voidedBy: text("voided_by").notNull(),
  reason: text("reason").notNull(),
  metricsJson: text("metrics_json").notNull().default("{}"),
}, (t) => [index("idx_report_correction_history_report").on(t.reportId)]);

export const regulatorySnapshots = pgTable(
  "regulatory_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    billedTodayCents: integer("billed_today_cents").notNull(),
    billedAccumulatedCents: integer("billed_accumulated_cents").notNull(),
    monthlyGoalCents: integer("monthly_goal_cents").notNull(),
    createdUnbilledTodayCents: integer("created_unbilled_today_cents").notNull(),
    createdUnbilledAccumulatedCents: integer("created_unbilled_accumulated_cents").notNull(),
    licensesToday: integer("licenses_today").notNull(),
    licensesAccumulated: integer("licenses_accumulated").notNull(),
    calculatedProgressBasisPoints: integer("calculated_progress_basis_points").notNull(),
    declaredProgressBasisPoints: integer("declared_progress_basis_points"),
    prospectsDeclared: boolean("prospects_declared").notNull().default(false),
    warningsJson: text("warnings_json").notNull().default("[]"),
    responsible: text("responsible").notNull(),
    source: text("source").notNull(),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_regulatory_snapshots_date").on(t.reportDate)],
);

export const financialSnapshots = pgTable(
  "financial_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    accountingPortfolioCents: integer("accounting_portfolio_cents").notNull(),
    effectiveCollectionsCents: integer("effective_collections_cents").notNull(),
    newBillingCents: integer("new_billing_cents").notNull(),
    confirmedPendingCents: integer("confirmed_pending_cents").notNull(),
    overduePendingCents: integer("overdue_pending_cents").notNull(),
    projectedPortfolioCents: integer("projected_portfolio_cents").notNull(),
    basePortfolioCents: integer("base_portfolio_cents"),
    additionalPotentialCents: integer("additional_potential_cents"),
    reportDateLabel: text("report_date_label").notNull().default(""),
    warningsJson: text("warnings_json").notNull().default("[]"),
    responsible: text("responsible").notNull(),
    source: text("source").notNull(),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_financial_snapshots_date").on(t.reportDate)],
);

export const commercialSnapshots = pgTable(
  "commercial_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    billedTodayCents: integer("billed_today_cents").notNull(),
    billedAccumulatedCents: integer("billed_accumulated_cents").notNull(),
    monthlyGoalCents: integer("monthly_goal_cents").notNull(),
    ordersToday: integer("orders_today").notNull(),
    ordersAccumulated: integer("orders_accumulated").notNull(),
    ordersGoal: integer("orders_goal").notNull(),
    newClientsToday: integer("new_clients_today").notNull(),
    newClientsAccumulated: integer("new_clients_accumulated").notNull(),
    activeTenders: integer("active_tenders").notNull(),
    wonTenders: integer("won_tenders").notNull(),
    calculatedProgressBasisPoints: integer("calculated_progress_basis_points").notNull(),
    responsible: text("responsible").notNull(),
    source: text("source").notNull(),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_commercial_snapshots_date").on(t.reportDate)],
);

export const reportProcessingRuns = pgTable("report_processing_runs", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  parserVersion: text("parser_version").notNull(),
  status: text("status").notNull(),
  error: text("error").notNull().default(""),
  resultJson: text("result_json").notNull().default("{}"),
  attemptedBy: text("attempted_by").notNull(),
  isReprocess: boolean("is_reprocess").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const crmUsers = pgTable("crm_users", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at"),
});

export const documentAuthorizations = pgTable(
  "document_authorizations",
  {
    id: serial("id").primaryKey(),
    documentType: text("document_type").notNull(),
    area: text("area").notNull(),
    responsible: text("responsible").notNull(),
    reportDate: text("report_date").notNull().default(""),
    authorizedBy: text("authorized_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_document_authorizations_date").on(t.reportDate, t.createdAt)],
);

export const dispatchSnapshots = pgTable(
  "dispatch_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    referencesLive: integer("references_live").notNull().default(0),
    highRisk: integer("high_risk").notNull().default(0),
    readyToInvoice: integer("ready_to_invoice").notNull().default(0),
    complianceBasisPoints: integer("compliance_basis_points").notNull().default(0),
    groupWongPending: integer("group_wong_pending").notNull().default(0),
    ecuasigadStatus: text("ecuasigad_status").notNull().default("Pendiente"),
    responsible: text("responsible").notNull(),
    nextAction: text("next_action").notNull(),
    source: text("source").notNull(),
    note: text("note").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_dispatch_snapshots_date").on(t.reportDate)],
);

export const receivableSnapshots = pgTable(
  "receivable_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    portfolioTotalCents: integer("portfolio_total_cents").notNull(),
    contractualOverdueCents: integer("contractual_overdue_cents").notNull(),
    collectedTodayCents: integer("collected_today_cents").notNull().default(0),
    newBillingCents: integer("new_billing_cents").notNull().default(0),
    confirmedPendingCents: integer("confirmed_pending_cents")
      .notNull()
      .default(0),
    projectedPortfolioCents: integer("projected_portfolio_cents")
      .notNull()
      .default(0),
    reimbursementsOverdueCents: integer("reimbursements_overdue_cents")
      .notNull()
      .default(0),
    over90Cents: integer("over_90_cents").notNull().default(0),
    responsible: text("responsible").notNull(),
    source: text("source").notNull(),
    note: text("note").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_receivable_snapshots_date").on(t.reportDate)],
);

export const collectionUpdates = pgTable(
  "collection_updates",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    client: text("client").notNull(),
    committedCents: integer("committed_cents").notNull().default(0),
    collectedCents: integer("collected_cents").notNull().default(0),
    pendingCents: integer("pending_cents").notNull().default(0),
    status: text("status").notNull(),
    responsible: text("responsible").notNull(),
    commitmentDate: text("commitment_date").notNull().default(""),
    nextAction: text("next_action").notNull(),
    source: text("source").notNull(),
    submittedBy: text("submitted_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("idx_collection_updates_date_client").on(t.reportDate, t.client),
  ],
);

export const clientControls = pgTable(
  "client_controls",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    client: text("client").notNull(),
    cutoffDate: text("cutoff_date").notNull(),
    nextCutoffDate: text("next_cutoff_date").notNull(),
    unbilledCents: integer("unbilled_cents").notNull().default(0),
    carryoverCents: integer("carryover_cents").notNull().default(0),
    fundAssignedCents: integer("fund_assigned_cents").notNull().default(0),
    fundUsedCents: integer("fund_used_cents").notNull().default(0),
    fundStatus: text("fund_status").notNull().default("Pendiente de confirmar"),
    responsible: text("responsible").notNull(),
    source: text("source").notNull(),
    note: text("note").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_client_controls_client_date").on(t.client, t.reportDate)],
);

export const inhouseSnapshots = pgTable(
  "inhouse_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    client: text("client").notNull().default("Corporación El Rosado"),
    davPending: integer("dav_pending").notNull().default(0),
    urgentDav: integer("urgent_dav").notNull().default(0),
    readyForPickup: integer("ready_for_pickup").notNull().default(0),
    checklistPending: integer("checklist_pending").notNull().default(0),
    storageAlerts: integer("storage_alerts").notNull().default(0),
    responsible: text("responsible").notNull(),
    nextAction: text("next_action").notNull(),
    source: text("source").notNull(),
    note: text("note").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_inhouse_snapshots_client_date").on(t.client, t.reportDate)],
);

export const elRosadoOperations = pgTable(
  "el_rosado_operations",
  {
    id: serial("id").primaryKey(),
    operationKey: text("operation_key").notNull(),
    operation: text("operation").notNull(),
    society: text("society").notNull().default("Corp El Rosado"),
    supplier: text("supplier").notNull().default(""),
    responsible: text("responsible").notNull().default(""),
    receivedAt: text("received_at").notNull().default(""),
    checklistAt: text("checklist_at").notNull().default(""),
    davSentAt: text("dav_sent_at").notNull().default(""),
    arrivalAt: text("arrival_at").notNull().default(""),
    davApprovedAt: text("dav_approved_at").notNull().default(""),
    transmittedAt: text("transmitted_at").notNull().default(""),
    authorizedExitAt: text("authorized_exit_at").notNull().default(""),
    pickupAt: text("pickup_at").notNull().default(""),
    ecasExpiresAt: text("ecas_expires_at").notNull().default(""),
    containers: text("containers").notNull().default(""),
    customsStatus: text("customs_status").notNull().default(""),
    observations: text("observations").notNull().default(""),
    documentsCompleteAt: text("documents_complete_at").notNull().default(""),
    delivered: boolean("delivered").notNull().default(false),
    source: text("source").notNull().default("Carga manual"),
    submittedBy: text("submitted_by").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("uq_el_rosado_operations_key").on(t.operationKey),
    index("idx_el_rosado_operations_arrival").on(t.arrivalAt),
    index("idx_el_rosado_operations_responsible").on(t.responsible),
  ],
);

export const payrollSnapshots = pgTable(
  "payroll_snapshots",
  {
    id: serial("id").primaryKey(),
    reportMonth: text("report_month").notNull(),
    headcount: integer("headcount").notNull().default(0),
    basePayrollCents: integer("base_payroll_cents").notNull().default(0),
    employerCostCents: integer("employer_cost_cents").notNull().default(0),
    newHires: integer("new_hires").notNull().default(0),
    exits: integer("exits").notNull().default(0),
    source: text("source").notNull(),
    note: text("note").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_payroll_snapshots_month").on(t.reportMonth)],
);

export const billingSnapshots = pgTable(
  "billing_snapshots",
  {
    id: serial("id").primaryKey(),
    reportDate: text("report_date").notNull(),
    daiAccumulatedCents: integer("dai_accumulated_cents").notNull().default(0),
    regulatoryAccumulatedCents: integer("regulatory_accumulated_cents").notNull().default(0),
    extrasAccumulatedCents: integer("extras_accumulated_cents").notNull().default(0),
    invoicedTodayCents: integer("invoiced_today_cents").notNull().default(0),
    invoicesToday: integer("invoices_today").notNull().default(0),
    readyToInvoice: integer("ready_to_invoice"),
    completedPending: integer("completed_pending"),
    blocked: integer("blocked"),
    responsible: text("responsible").notNull(),
    source: text("source").notNull(),
    note: text("note").notNull().default(""),
    submittedBy: text("submitted_by").notNull(),
    sourceReportId: integer("source_report_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_billing_snapshots_date").on(t.reportDate)],
);

export const legalConsultations = pgTable(
  "legal_consultations",
  {
    id: serial("id").primaryKey(),
    entityName: text("entity_name").notNull(),
    ruc: text("ruc").notNull(),
    product: text("product").notNull(),
    subheading: text("subheading").notNull().default(""),
    sourceLabel: text("source_label").notNull(),
    sourceUrl: text("source_url").notNull(),
    resultStatus: text("result_status").notNull(),
    resultSummary: text("result_summary").notNull(),
    evidenceName: text("evidence_name").notNull(),
    evidenceKey: text("evidence_key").notNull(),
    evidenceMime: text("evidence_mime").notNull(),
    evidenceBytes: integer("evidence_bytes").notNull(),
    evidenceSha256: text("evidence_sha256").notNull(),
    checkedBy: text("checked_by").notNull(),
    checkedByName: text("checked_by_name").notNull(),
    checkedAt: text("checked_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_legal_consultations_ruc_date").on(t.ruc, t.checkedAt), index("idx_legal_consultations_date").on(t.checkedAt)],
);

export const grupoUneOperations = pgTable(
  "grupo_une_operations",
  {
    id: serial("id").primaryKey(),
    company: text("company").notNull().default("ECUABARNICES"),
    purchaseOrder: text("purchase_order").notNull(),
    customsReference: text("customs_reference").notNull().default(""),
    supplier: text("supplier").notNull().default(""),
    product: text("product").notNull().default(""),
    status: text("status").notNull().default("PLANIFICADO"),
    etd: text("etd"),
    eta: text("eta"),
    warehouseReceiptDate: text("warehouse_receipt_date"),
    sapEntryDate: text("sap_entry_date"),
    noticeDate: text("notice_date").notNull().default(""),
    ocCreationDate: text("oc_creation_date").notNull().default(""),
    valueQuantitySentDate: text("value_quantity_sent_date").notNull().default(""),
    ocBalancedDate: text("oc_balanced_date").notNull().default(""),
    ocRetentionNoticeDate: text("oc_retention_notice_date").notNull().default(""),
    ocReleaseDate: text("oc_release_date").notNull().default(""),
    approval1Date: text("approval_1_date").notNull().default(""),
    approval2Date: text("approval_2_date").notNull().default(""),
    approval3Date: text("approval_3_date").notNull().default(""),
    cxpSentDate: text("cxp_sent_date").notNull().default(""),
    cxpRegisteredDate: text("cxp_registered_date").notNull().default(""),
    warehouseEntryRequestedDate: text("warehouse_entry_requested_date").notNull().default(""),
    storageCostCents: integer("storage_cost_cents").notNull().default(0),
    weightKg: integer("weight_kg").notNull().default(0),
    valuesRequestedDate: text("values_requested_date").notNull().default(""),
    arrivalDate: text("arrival_date").notNull().default(""),
    macobsaPaymentDate: text("macobsa_payment_date").notNull().default(""),
    transportMode: text("transport_mode").notNull().default(""),
    documentsReceivedAt: text("documents_received_at").notNull().default(""),
    documentsSentExecutiveAt: text("documents_sent_executive_at").notNull().default(""),
    incoterm: text("incoterm").notNull().default(""),
    originCountry: text("origin_country").notNull().default(""),
    loadingPort: text("loading_port").notNull().default(""),
    arrivalPort: text("arrival_port").notNull().default(""),
    transitDays: integer("transit_days"),
    etaToWarehouseDays: integer("eta_to_warehouse_days"),
    warehouseToSapDays: integer("warehouse_to_sap_days"),
    etaToSapDays: integer("eta_to_sap_days"),
    ocCompliance: text("oc_compliance").notNull().default("PENDIENTE"),
    ocComplianceNotes: text("oc_compliance_notes").notNull().default(""),
    notes: text("notes").notNull().default(""),
    source: text("source").notNull().default("Carga manual"),
    submittedBy: text("submitted_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("uq_grupo_une_company_po").on(t.company, t.purchaseOrder),
    index("idx_grupo_une_eta").on(t.eta),
    index("idx_grupo_une_status").on(t.status),
  ],
);
