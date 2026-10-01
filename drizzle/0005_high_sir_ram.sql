ALTER TABLE `receivable_snapshots` ADD `new_billing_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `receivable_snapshots` ADD `confirmed_pending_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `receivable_snapshots` ADD `projected_portfolio_cents` integer DEFAULT 0 NOT NULL;