CREATE TABLE `billing_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`dai_accumulated_cents` integer DEFAULT 0 NOT NULL,
	`regulatory_accumulated_cents` integer DEFAULT 0 NOT NULL,
	`extras_accumulated_cents` integer DEFAULT 0 NOT NULL,
	`invoiced_today_cents` integer DEFAULT 0 NOT NULL,
	`invoices_today` integer DEFAULT 0 NOT NULL,
	`ready_to_invoice` integer,
	`completed_pending` integer,
	`blocked` integer,
	`responsible` text NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_billing_snapshots_date` ON `billing_snapshots` (`report_date`);