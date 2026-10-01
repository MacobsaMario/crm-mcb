CREATE TABLE "crm_users" (
	"email" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_login_at" text
);
