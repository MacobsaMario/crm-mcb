CREATE TABLE `report_correction_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`area` text NOT NULL,
	`report_date` text NOT NULL,
	`responsible` text NOT NULL,
	`original_name` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text NOT NULL,
	`voided_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`voided_by` text NOT NULL,
	`reason` text NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_report_correction_history_report` ON `report_correction_history` (`report_id`);
