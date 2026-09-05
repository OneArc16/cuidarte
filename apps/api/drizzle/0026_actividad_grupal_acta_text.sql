ALTER TABLE "actividades_grupales"
ALTER COLUMN "acta_number" TYPE varchar(40)
USING lpad("acta_number"::text, 4, '0');
