ALTER TABLE "actividad_grupal_tipos" ADD COLUMN "consecutive_creator_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "actividad_grupal_tipos" AS activity_type
SET "consecutive_creator_user_ids" = COALESCE(
  (
    SELECT jsonb_agg(to_jsonb(user_row.id::text) ORDER BY user_row.full_name)
    FROM "users" AS user_row
    WHERE user_row.is_active = true
      AND (
        user_row.tenant_id = activity_type.tenant_id
        OR (user_row.tenant_id IS NULL AND user_row.role = 'super_admin')
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(activity_type."consecutive_creator_roles") AS allowed_role(role_name)
        WHERE allowed_role.role_name = user_row.role::text
      )
  ),
  '[]'::jsonb
)
WHERE activity_type."consecutive_prefix" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipos" DROP COLUMN "consecutive_creator_roles";