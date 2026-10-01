ALTER TABLE `opportunities` ADD `source` text DEFAULT 'Registro del equipo' NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `submitted_by` text DEFAULT '' NOT NULL;