CREATE TABLE `daily_report_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`report_date` text NOT NULL,
	`responsible` text NOT NULL,
	`original_name` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_daily_report_uploads_area_date` ON `daily_report_uploads` (`area`,`report_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_daily_report_uploads_owner_date` ON `daily_report_uploads` (`area`,`responsible`,`report_date`);--> statement-breakpoint
PRAGMA optimize;
