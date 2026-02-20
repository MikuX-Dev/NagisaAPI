ALTER TABLE "info" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "info" ADD COLUMN "trailers" jsonb NOT NULL;