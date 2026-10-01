CREATE TABLE `dispatch_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`references_live` integer DEFAULT 0 NOT NULL,
	`high_risk` integer DEFAULT 0 NOT NULL,
	`ready_to_invoice` integer DEFAULT 0 NOT NULL,
	`compliance_basis_points` integer DEFAULT 0 NOT NULL,
	`group_wong_pending` integer DEFAULT 0 NOT NULL,
	`ecuasigad_status` text DEFAULT 'Pendiente' NOT NULL,
	`responsible` text NOT NULL,
	`next_action` text NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_dispatch_snapshots_date` ON `dispatch_snapshots` (`report_date`);