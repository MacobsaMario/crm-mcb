CREATE TABLE `department_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`metric` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'En seguimiento' NOT NULL,
	`responsible` text NOT NULL,
	`report_date` text NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_department_updates_area_date` ON `department_updates` (`area`,`report_date`);