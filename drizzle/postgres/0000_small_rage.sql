CREATE TABLE "billing_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"dai_accumulated_cents" integer DEFAULT 0 NOT NULL,
	"regulatory_accumulated_cents" integer DEFAULT 0 NOT NULL,
	"extras_accumulated_cents" integer DEFAULT 0 NOT NULL,
	"invoiced_today_cents" integer DEFAULT 0 NOT NULL,
	"invoices_today" integer DEFAULT 0 NOT NULL,
	"ready_to_invoice" integer,
	"completed_pending" integer,
	"blocked" integer,
	"responsible" text NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"client" text NOT NULL,
	"cutoff_date" text NOT NULL,
	"next_cutoff_date" text NOT NULL,
	"unbilled_cents" integer DEFAULT 0 NOT NULL,
	"carryover_cents" integer DEFAULT 0 NOT NULL,
	"fund_assigned_cents" integer DEFAULT 0 NOT NULL,
	"fund_used_cents" integer DEFAULT 0 NOT NULL,
	"fund_status" text DEFAULT 'Pendiente de confirmar' NOT NULL,
	"responsible" text NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"client" text NOT NULL,
	"committed_cents" integer DEFAULT 0 NOT NULL,
	"collected_cents" integer DEFAULT 0 NOT NULL,
	"pending_cents" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"responsible" text NOT NULL,
	"commitment_date" text DEFAULT '' NOT NULL,
	"next_action" text NOT NULL,
	"source" text NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"billed_today_cents" integer NOT NULL,
	"billed_accumulated_cents" integer NOT NULL,
	"monthly_goal_cents" integer NOT NULL,
	"orders_today" integer NOT NULL,
	"orders_accumulated" integer NOT NULL,
	"orders_goal" integer NOT NULL,
	"new_clients_today" integer NOT NULL,
	"new_clients_accumulated" integer NOT NULL,
	"active_tenders" integer NOT NULL,
	"won_tenders" integer NOT NULL,
	"calculated_progress_basis_points" integer NOT NULL,
	"responsible" text NOT NULL,
	"source" text NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_report_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"report_date" text NOT NULL,
	"responsible" text NOT NULL,
	"original_name" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"extracted_text" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"source_evidence" text DEFAULT '' NOT NULL,
	"next_action" text DEFAULT '' NOT NULL,
	"commitment_date" text DEFAULT '' NOT NULL,
	"processing_status" text DEFAULT 'legacy' NOT NULL,
	"processed_at" text,
	"processing_error" text DEFAULT '' NOT NULL,
	"parser_version" text DEFAULT '' NOT NULL,
	"content_sha256" text DEFAULT '' NOT NULL,
	"origin_type" text DEFAULT 'legacy' NOT NULL,
	"reprocess_count" integer DEFAULT 0 NOT NULL,
	"last_reprocessed_at" text,
	"submitted_name" text DEFAULT '' NOT NULL,
	"processing_token" text,
	"processing_started_at" text
);
--> statement-breakpoint
CREATE TABLE "department_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"metric" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'En seguimiento' NOT NULL,
	"responsible" text NOT NULL,
	"report_date" text NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"references_live" integer DEFAULT 0 NOT NULL,
	"high_risk" integer DEFAULT 0 NOT NULL,
	"ready_to_invoice" integer DEFAULT 0 NOT NULL,
	"compliance_basis_points" integer DEFAULT 0 NOT NULL,
	"group_wong_pending" integer DEFAULT 0 NOT NULL,
	"ecuasigad_status" text DEFAULT 'Pendiente' NOT NULL,
	"responsible" text NOT NULL,
	"next_action" text NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_type" text NOT NULL,
	"area" text NOT NULL,
	"responsible" text NOT NULL,
	"report_date" text DEFAULT '' NOT NULL,
	"authorized_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "el_rosado_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_key" text NOT NULL,
	"operation" text NOT NULL,
	"society" text DEFAULT 'Corp El Rosado' NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"responsible" text DEFAULT '' NOT NULL,
	"received_at" text DEFAULT '' NOT NULL,
	"checklist_at" text DEFAULT '' NOT NULL,
	"dav_sent_at" text DEFAULT '' NOT NULL,
	"arrival_at" text DEFAULT '' NOT NULL,
	"dav_approved_at" text DEFAULT '' NOT NULL,
	"transmitted_at" text DEFAULT '' NOT NULL,
	"authorized_exit_at" text DEFAULT '' NOT NULL,
	"pickup_at" text DEFAULT '' NOT NULL,
	"ecas_expires_at" text DEFAULT '' NOT NULL,
	"containers" text DEFAULT '' NOT NULL,
	"customs_status" text DEFAULT '' NOT NULL,
	"observations" text DEFAULT '' NOT NULL,
	"documents_complete_at" text DEFAULT '' NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'Carga manual' NOT NULL,
	"submitted_by" text NOT NULL,
	"archived_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"accounting_portfolio_cents" integer NOT NULL,
	"effective_collections_cents" integer NOT NULL,
	"new_billing_cents" integer NOT NULL,
	"confirmed_pending_cents" integer NOT NULL,
	"overdue_pending_cents" integer NOT NULL,
	"projected_portfolio_cents" integer NOT NULL,
	"base_portfolio_cents" integer,
	"additional_potential_cents" integer,
	"report_date_label" text DEFAULT '' NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"responsible" text NOT NULL,
	"source" text NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupo_une_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text DEFAULT 'ECUABARNICES' NOT NULL,
	"purchase_order" text NOT NULL,
	"customs_reference" text DEFAULT '' NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"product" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'PLANIFICADO' NOT NULL,
	"etd" text,
	"eta" text,
	"warehouse_receipt_date" text,
	"sap_entry_date" text,
	"notice_date" text DEFAULT '' NOT NULL,
	"oc_creation_date" text DEFAULT '' NOT NULL,
	"value_quantity_sent_date" text DEFAULT '' NOT NULL,
	"oc_balanced_date" text DEFAULT '' NOT NULL,
	"oc_retention_notice_date" text DEFAULT '' NOT NULL,
	"oc_release_date" text DEFAULT '' NOT NULL,
	"approval_1_date" text DEFAULT '' NOT NULL,
	"approval_2_date" text DEFAULT '' NOT NULL,
	"approval_3_date" text DEFAULT '' NOT NULL,
	"cxp_sent_date" text DEFAULT '' NOT NULL,
	"cxp_registered_date" text DEFAULT '' NOT NULL,
	"warehouse_entry_requested_date" text DEFAULT '' NOT NULL,
	"storage_cost_cents" integer DEFAULT 0 NOT NULL,
	"weight_kg" integer DEFAULT 0 NOT NULL,
	"values_requested_date" text DEFAULT '' NOT NULL,
	"arrival_date" text DEFAULT '' NOT NULL,
	"macobsa_payment_date" text DEFAULT '' NOT NULL,
	"transport_mode" text DEFAULT '' NOT NULL,
	"documents_received_at" text DEFAULT '' NOT NULL,
	"documents_sent_executive_at" text DEFAULT '' NOT NULL,
	"incoterm" text DEFAULT '' NOT NULL,
	"origin_country" text DEFAULT '' NOT NULL,
	"loading_port" text DEFAULT '' NOT NULL,
	"arrival_port" text DEFAULT '' NOT NULL,
	"transit_days" integer,
	"eta_to_warehouse_days" integer,
	"warehouse_to_sap_days" integer,
	"eta_to_sap_days" integer,
	"oc_compliance" text DEFAULT 'PENDIENTE' NOT NULL,
	"oc_compliance_notes" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'Carga manual' NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inhouse_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"client" text DEFAULT 'Corporación El Rosado' NOT NULL,
	"dav_pending" integer DEFAULT 0 NOT NULL,
	"urgent_dav" integer DEFAULT 0 NOT NULL,
	"ready_for_pickup" integer DEFAULT 0 NOT NULL,
	"checklist_pending" integer DEFAULT 0 NOT NULL,
	"storage_alerts" integer DEFAULT 0 NOT NULL,
	"responsible" text NOT NULL,
	"next_action" text NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_name" text NOT NULL,
	"ruc" text NOT NULL,
	"product" text NOT NULL,
	"subheading" text DEFAULT '' NOT NULL,
	"source_label" text NOT NULL,
	"source_url" text NOT NULL,
	"result_status" text NOT NULL,
	"result_summary" text NOT NULL,
	"evidence_name" text NOT NULL,
	"evidence_key" text NOT NULL,
	"evidence_mime" text NOT NULL,
	"evidence_bytes" integer NOT NULL,
	"evidence_sha256" text NOT NULL,
	"checked_by" text NOT NULL,
	"checked_by_name" text NOT NULL,
	"checked_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client" text NOT NULL,
	"title" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"stage" text DEFAULT 'Calificación' NOT NULL,
	"owner" text NOT NULL,
	"next_action" text DEFAULT '' NOT NULL,
	"due_date" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'Registro del equipo' NOT NULL,
	"submitted_by" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_month" text NOT NULL,
	"headcount" integer DEFAULT 0 NOT NULL,
	"base_payroll_cents" integer DEFAULT 0 NOT NULL,
	"employer_cost_cents" integer DEFAULT 0 NOT NULL,
	"new_hires" integer DEFAULT 0 NOT NULL,
	"exits" integer DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivable_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"portfolio_total_cents" integer NOT NULL,
	"contractual_overdue_cents" integer NOT NULL,
	"collected_today_cents" integer DEFAULT 0 NOT NULL,
	"new_billing_cents" integer DEFAULT 0 NOT NULL,
	"confirmed_pending_cents" integer DEFAULT 0 NOT NULL,
	"projected_portfolio_cents" integer DEFAULT 0 NOT NULL,
	"reimbursements_overdue_cents" integer DEFAULT 0 NOT NULL,
	"over_90_cents" integer DEFAULT 0 NOT NULL,
	"responsible" text NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"billed_today_cents" integer NOT NULL,
	"billed_accumulated_cents" integer NOT NULL,
	"monthly_goal_cents" integer NOT NULL,
	"created_unbilled_today_cents" integer NOT NULL,
	"created_unbilled_accumulated_cents" integer NOT NULL,
	"licenses_today" integer NOT NULL,
	"licenses_accumulated" integer NOT NULL,
	"calculated_progress_basis_points" integer NOT NULL,
	"declared_progress_basis_points" integer,
	"prospects_declared" boolean DEFAULT false NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"responsible" text NOT NULL,
	"source" text NOT NULL,
	"submitted_by" text NOT NULL,
	"source_report_id" integer NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_correction_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"area" text NOT NULL,
	"report_date" text NOT NULL,
	"responsible" text NOT NULL,
	"original_name" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"extracted_text" text DEFAULT '' NOT NULL,
	"submitted_by" text NOT NULL,
	"created_at" text NOT NULL,
	"voided_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"voided_by" text NOT NULL,
	"reason" text NOT NULL,
	"metrics_json" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_processing_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"parser_version" text NOT NULL,
	"status" text NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	"result_json" text DEFAULT '{}' NOT NULL,
	"attempted_by" text NOT NULL,
	"is_reprocess" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_billing_snapshots_date" ON "billing_snapshots" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_client_controls_client_date" ON "client_controls" USING btree ("client","report_date");--> statement-breakpoint
CREATE INDEX "idx_collection_updates_date_client" ON "collection_updates" USING btree ("report_date","client");--> statement-breakpoint
CREATE INDEX "idx_commercial_snapshots_date" ON "commercial_snapshots" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_daily_report_uploads_area_date" ON "daily_report_uploads" USING btree ("area","report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_daily_report_uploads_owner_date" ON "daily_report_uploads" USING btree ("area","responsible","report_date");--> statement-breakpoint
CREATE INDEX "idx_department_updates_area_date" ON "department_updates" USING btree ("area","report_date");--> statement-breakpoint
CREATE INDEX "idx_dispatch_snapshots_date" ON "dispatch_snapshots" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_document_authorizations_date" ON "document_authorizations" USING btree ("report_date","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_el_rosado_operations_key" ON "el_rosado_operations" USING btree ("operation_key");--> statement-breakpoint
CREATE INDEX "idx_el_rosado_operations_arrival" ON "el_rosado_operations" USING btree ("arrival_at");--> statement-breakpoint
CREATE INDEX "idx_el_rosado_operations_responsible" ON "el_rosado_operations" USING btree ("responsible");--> statement-breakpoint
CREATE INDEX "idx_financial_snapshots_date" ON "financial_snapshots" USING btree ("report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_grupo_une_company_po" ON "grupo_une_operations" USING btree ("company","purchase_order");--> statement-breakpoint
CREATE INDEX "idx_grupo_une_eta" ON "grupo_une_operations" USING btree ("eta");--> statement-breakpoint
CREATE INDEX "idx_grupo_une_status" ON "grupo_une_operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inhouse_snapshots_client_date" ON "inhouse_snapshots" USING btree ("client","report_date");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_ruc_date" ON "legal_consultations" USING btree ("ruc","checked_at");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_date" ON "legal_consultations" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "idx_payroll_snapshots_month" ON "payroll_snapshots" USING btree ("report_month");--> statement-breakpoint
CREATE INDEX "idx_receivable_snapshots_date" ON "receivable_snapshots" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_regulatory_snapshots_date" ON "regulatory_snapshots" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_report_correction_history_report" ON "report_correction_history" USING btree ("report_id");