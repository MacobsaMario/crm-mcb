CREATE TABLE `document_authorizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_type` text NOT NULL,
	`area` text NOT NULL,
	`responsible` text NOT NULL,
	`report_date` text DEFAULT '' NOT NULL,
	`authorized_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_document_authorizations_date` ON `document_authorizations` (`report_date`,`created_at`);