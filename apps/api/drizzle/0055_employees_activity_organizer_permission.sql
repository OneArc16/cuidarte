ALTER TABLE "users"
ADD COLUMN "can_create_activities_for_other_organizers" boolean DEFAULT false NOT NULL;
