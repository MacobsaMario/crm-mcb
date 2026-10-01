CREATE TABLE `client_controls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`client` text NOT NULL,
	`cutoff_date` text NOT NULL,
	`next_cutoff_date` text NOT NULL,
	`unbilled_cents` integer DEFAULT 0 NOT NULL,
	`carryover_cents` integer DEFAULT 0 NOT NULL,
	`fund_assigned_cents` integer DEFAULT 0 NOT NULL,
	`fund_used_cents` integer DEFAULT 0 NOT NULL,
	`fund_status` text DEFAULT 'Pendiente de confirmar' NOT NULL,
	`responsible` text NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_client_controls_client_date` ON `client_controls` (`client`,`report_date`);