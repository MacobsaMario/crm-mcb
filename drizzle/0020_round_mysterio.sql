CREATE TABLE `grupo_une_operations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text DEFAULT 'ECUABARNICES' NOT NULL,
	`purchase_order` text NOT NULL,
	`customs_reference` text DEFAULT '' NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`product` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PLANIFICADO' NOT NULL,
	`etd` text,
	`eta` text,
	`warehouse_receipt_date` text,
	`sap_entry_date` text,
	`incoterm` text DEFAULT '' NOT NULL,
	`origin_country` text DEFAULT '' NOT NULL,
	`loading_port` text DEFAULT '' NOT NULL,
	`arrival_port` text DEFAULT '' NOT NULL,
	`transit_days` integer,
	`eta_to_warehouse_days` integer,
	`warehouse_to_sap_days` integer,
	`eta_to_sap_days` integer,
	`oc_compliance` text DEFAULT 'PENDIENTE' NOT NULL,
	`oc_compliance_notes` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'Carga manual' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_grupo_une_company_po` ON `grupo_une_operations` (`company`,`purchase_order`);--> statement-breakpoint
CREATE INDEX `idx_grupo_une_eta` ON `grupo_une_operations` (`eta`);--> statement-breakpoint
CREATE INDEX `idx_grupo_une_status` ON `grupo_une_operations` (`status`);