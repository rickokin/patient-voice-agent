CREATE TABLE "generated_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"query_id" uuid,
	"artifact_type" text NOT NULL,
	"artifact_title" text NOT NULL,
	"source_question" text NOT NULL,
	"source_answer" text,
	"retrieved_moment_ids" uuid[] DEFAULT '{}' NOT NULL,
	"content_json" jsonb NOT NULL,
	"content_markdown" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_query_id_query_logs_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."query_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_artifacts_query_idx" ON "generated_artifacts" USING btree ("query_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_user_idx" ON "generated_artifacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_type_idx" ON "generated_artifacts" USING btree ("artifact_type");--> statement-breakpoint
CREATE INDEX "generated_artifacts_created_idx" ON "generated_artifacts" USING btree ("created_at");