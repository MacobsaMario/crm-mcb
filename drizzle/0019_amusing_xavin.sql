CREATE TABLE `legal_consultations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_name` text NOT NULL,
	`ruc` text NOT NULL,
	`product` text NOT NULL,
	`subheading` text DEFAULT '' NOT NULL,
	`source_label` text NOT NULL,
	`source_url` text NOT NULL,
	`result_status` text NOT NULL,
	`result_summary` text NOT NULL,
	`evidence_name` text NOT NULL,
	`evidence_key` text NOT NULL,
	`evidence_mime` text NOT NULL,
	`evidence_bytes` integer NOT NULL,
	`evidence_sha256` text NOT NULL,
	`checked_by` text NOT NULL,
	`checked_by_name` text NOT NULL,
	`checked_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_legal_consultations_ruc_date` ON `legal_consultations` (`ruc`,`checked_at`);--> statement-breakpoint
CREATE INDEX `idx_legal_consultations_date` ON `legal_consultations` (`checked_at`);--> statement-breakpoint
