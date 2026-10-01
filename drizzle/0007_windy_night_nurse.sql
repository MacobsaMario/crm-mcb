CREATE TABLE `payroll_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_month` text NOT NULL,
	`headcount` integer DEFAULT 0 NOT NULL,
	`base_payroll_cents` integer DEFAULT 0 NOT NULL,
	`employer_cost_cents` integer DEFAULT 0 NOT NULL,
	`new_hires` integer DEFAULT 0 NOT NULL,
	`exits` integer DEFAULT 0 NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payroll_snapshots_month` ON `payroll_snapshots` (`report_month`);