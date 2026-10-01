CREATE TABLE `inhouse_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`client` text DEFAULT 'Corporación El Rosado' NOT NULL,
	`dav_pending` integer DEFAULT 0 NOT NULL,
	`urgent_dav` integer DEFAULT 0 NOT NULL,
	`ready_for_pickup` integer DEFAULT 0 NOT NULL,
	`checklist_pending` integer DEFAULT 0 NOT NULL,
	`storage_alerts` integer DEFAULT 0 NOT NULL,
	`responsible` text NOT NULL,
	`next_action` text NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_inhouse_snapshots_client_date` ON `inhouse_snapshots` (`client`,`report_date`);