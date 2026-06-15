CREATE TABLE "allowed_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'curator' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;