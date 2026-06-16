CREATE TABLE "query_log_audio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_log_id" uuid NOT NULL,
	"mime_type" text NOT NULL,
	"voice" text NOT NULL,
	"model" text NOT NULL,
	"audio" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "query_log_audio_query_log_id_unique" UNIQUE("query_log_id")
);
--> statement-breakpoint
ALTER TABLE "query_log_audio" ADD CONSTRAINT "query_log_audio_query_log_id_query_logs_id_fk" FOREIGN KEY ("query_log_id") REFERENCES "public"."query_logs"("id") ON DELETE cascade ON UPDATE no action;