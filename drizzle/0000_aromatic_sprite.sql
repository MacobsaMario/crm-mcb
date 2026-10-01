CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client` text NOT NULL,
	`title` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`stage` text DEFAULT 'Calificación' NOT NULL,
	`owner` text NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
