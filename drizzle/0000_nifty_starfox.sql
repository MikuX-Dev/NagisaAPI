CREATE TABLE "episode" (
	"id" text NOT NULL,
	"info_id" text NOT NULL,
	"titles" jsonb,
	"thumbnail_image" text,
	"preview" text,
	"description" text,
	"number" integer NOT NULL,
	"rating" integer,
	"filler" boolean NOT NULL,
	"recap" boolean NOT NULL,
	"runtime" integer,
	"ago" text,
	"providers" jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "episode_id_info_id_pk" PRIMARY KEY("id","info_id")
);
--> statement-breakpoint
CREATE TABLE "genre" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "genre_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "info" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"external_ids" jsonb,
	"titles" jsonb NOT NULL,
	"synonyms" jsonb NOT NULL,
	"cover_image" text,
	"banner_image" text,
	"logo_image" text,
	"color" text,
	"description" text,
	"air_date" jsonb,
	"status" text,
	"format" text,
	"season" text,
	"relations" jsonb,
	"current_episode" integer,
	"country_of_origin" text,
	"total_episodes" integer,
	"sub_count" integer,
	"dub_count" integer,
	"rating" integer,
	"age_rating" text,
	"characters" jsonb NOT NULL,
	"artwork" jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "info_to_genre" (
	"info_id" text NOT NULL,
	"genre_id" text NOT NULL,
	CONSTRAINT "info_to_genre_info_id_genre_id_pk" PRIMARY KEY("info_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "info_to_studio" (
	"info_id" text NOT NULL,
	"studio_id" text NOT NULL,
	CONSTRAINT "info_to_studio_info_id_studio_id_pk" PRIMARY KEY("info_id","studio_id")
);
--> statement-breakpoint
CREATE TABLE "info_to_tag" (
	"info_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "info_to_tag_info_id_tag_id_pk" PRIMARY KEY("info_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "studio" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "studio_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "episode" ADD CONSTRAINT "episode_info_id_info_id_fk" FOREIGN KEY ("info_id") REFERENCES "public"."info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_to_genre" ADD CONSTRAINT "info_to_genre_info_id_info_id_fk" FOREIGN KEY ("info_id") REFERENCES "public"."info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_to_genre" ADD CONSTRAINT "info_to_genre_genre_id_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_to_studio" ADD CONSTRAINT "info_to_studio_info_id_info_id_fk" FOREIGN KEY ("info_id") REFERENCES "public"."info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_to_studio" ADD CONSTRAINT "info_to_studio_studio_id_studio_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_to_tag" ADD CONSTRAINT "info_to_tag_info_id_info_id_fk" FOREIGN KEY ("info_id") REFERENCES "public"."info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_to_tag" ADD CONSTRAINT "info_to_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episode_info_id_idx" ON "episode" USING btree ("info_id");--> statement-breakpoint
CREATE INDEX "episode_number_idx" ON "episode" USING btree ("number");--> statement-breakpoint
CREATE INDEX "genre_name_idx" ON "genre" USING btree ("name");--> statement-breakpoint
CREATE INDEX "slug_idx" ON "info" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "status_idx" ON "info" USING btree ("status");--> statement-breakpoint
CREATE INDEX "info_to_genre_info_id_idx" ON "info_to_genre" USING btree ("info_id");--> statement-breakpoint
CREATE INDEX "info_to_genre_genre_id_idx" ON "info_to_genre" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "info_to_studio_info_id_idx" ON "info_to_studio" USING btree ("info_id");--> statement-breakpoint
CREATE INDEX "info_to_studio_studio_id_idx" ON "info_to_studio" USING btree ("studio_id");--> statement-breakpoint
CREATE INDEX "info_to_tag_info_id_idx" ON "info_to_tag" USING btree ("info_id");--> statement-breakpoint
CREATE INDEX "info_to_tag_tag_id_idx" ON "info_to_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "studio_name_idx" ON "studio" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tag_name_idx" ON "tag" USING btree ("name");