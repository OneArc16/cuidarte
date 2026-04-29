CREATE TABLE "cie10_catalog" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"title_normalized" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cie10_catalog_title_idx" ON "cie10_catalog" USING btree ("title");
--> statement-breakpoint
CREATE INDEX "cie10_catalog_title_normalized_idx" ON "cie10_catalog" USING btree ("title_normalized");
--> statement-breakpoint
CREATE INDEX "cie10_catalog_is_active_idx" ON "cie10_catalog" USING btree ("is_active");
