CREATE TABLE `collection_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`client` text NOT NULL,
	`committed_cents` integer DEFAULT 0 NOT NULL,
	`collected_cents` integer DEFAULT 0 NOT NULL,
	`pending_cents` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`responsible` text NOT NULL,
	`commitment_date` text DEFAULT '' NOT NULL,
	`next_action` text NOT NULL,
	`source` text NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_collection_updates_date_client` ON `collection_updates` (`report_date`,`client`);--> statement-breakpoint
CREATE TABLE `receivable_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`portfolio_total_cents` integer NOT NULL,
	`contractual_overdue_cents` integer NOT NULL,
	`collected_today_cents` integer DEFAULT 0 NOT NULL,
	`reimbursements_overdue_cents` integer DEFAULT 0 NOT NULL,
	`over_90_cents` integer DEFAULT 0 NOT NULL,
	`responsible` text NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_receivable_snapshots_date` ON `receivable_snapshots` (`report_date`);