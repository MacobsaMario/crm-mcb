CREATE TABLE `el_rosado_operations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_key` text NOT NULL,
	`operation` text NOT NULL,
	`society` text DEFAULT 'Corp El Rosado' NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`responsible` text DEFAULT '' NOT NULL,
	`received_at` text DEFAULT '' NOT NULL,
	`checklist_at` text DEFAULT '' NOT NULL,
	`dav_sent_at` text DEFAULT '' NOT NULL,
	`arrival_at` text DEFAULT '' NOT NULL,
	`dav_approved_at` text DEFAULT '' NOT NULL,
	`transmitted_at` text DEFAULT '' NOT NULL,
	`authorized_exit_at` text DEFAULT '' NOT NULL,
	`pickup_at` text DEFAULT '' NOT NULL,
	`ecas_expires_at` text DEFAULT '' NOT NULL,
	`containers` text DEFAULT '' NOT NULL,
	`customs_status` text DEFAULT '' NOT NULL,
	`observations` text DEFAULT '' NOT NULL,
	`documents_complete_at` text DEFAULT '' NOT NULL,
	`delivered` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'Carga manual' NOT NULL,
	`submitted_by` text NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_el_rosado_operations_key` ON `el_rosado_operations` (`operation_key`);
--> statement-breakpoint
CREATE INDEX `idx_el_rosado_operations_arrival` ON `el_rosado_operations` (`arrival_at`);
--> statement-breakpoint
CREATE INDEX `idx_el_rosado_operations_responsible` ON `el_rosado_operations` (`responsible`);
