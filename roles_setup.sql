ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS modulos_rol jsonb DEFAULT '{}'::jsonb;
ALTER TABLE org_usuarios   ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE suscripciones  ADD COLUMN IF NOT EXISTS organizacion_id uuid REFERENCES organizaciones(id);

-- Backfill email en org_usuarios desde auth.users
UPDATE org_usuarios ou SET email = u.email
  FROM auth.users u WHERE ou.user_id = u.id AND ou.email IS NULL;

-- Backfill organizacion_id en suscripciones (vía el usuario dueño)
UPDATE suscripciones s SET organizacion_id = ou.organizacion_id
  FROM org_usuarios ou JOIN auth.users u ON u.id = ou.user_id
  WHERE u.email = s.email AND s.organizacion_id IS NULL;
