ALTER TABLE "adultos_mayores"
ALTER COLUMN "health_regime" TYPE varchar(120) USING "health_regime"::varchar(120);
