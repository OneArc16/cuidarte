DROP INDEX "eps_nit_unique";
--> statement-breakpoint
CREATE INDEX "eps_nit_idx" ON "eps" USING btree ("nit");
