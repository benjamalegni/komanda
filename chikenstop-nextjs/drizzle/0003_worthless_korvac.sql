CREATE TABLE IF NOT EXISTS "admin_users" (
	"username" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_payments" ADD COLUMN "order_snapshot" jsonb;
