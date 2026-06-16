ALTER TABLE "query_log_moments" DROP CONSTRAINT "query_log_moments_moment_id_moments_id_fk";
--> statement-breakpoint
ALTER TABLE "query_log_moments" ALTER COLUMN "moment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "query_log_moments" ADD COLUMN "moment_title" text;--> statement-breakpoint
ALTER TABLE "query_log_moments" ADD COLUMN "moment_quote" text;--> statement-breakpoint
ALTER TABLE "query_log_moments" ADD CONSTRAINT "query_log_moments_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE set null ON UPDATE no action;