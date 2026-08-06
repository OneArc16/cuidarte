CREATE TABLE "reference_data_versions" (
	"dataset" varchar(100) PRIMARY KEY NOT NULL,
	"version" varchar(50) NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"row_count" integer NOT NULL,
	"source" varchar(500) NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_data_versions_row_count_positive" CHECK ("reference_data_versions"."row_count" > 0)
);
