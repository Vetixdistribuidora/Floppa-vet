-- Visibilidad de módulos por rol (la configura el dueño de la clínica)
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS modulos_rol jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Email del usuario (denormalizado para listar empleados sin tocar auth.users)
ALTER TABLE org_usuarios ADD COLUMN IF NOT EXISTS email text;
-- Vincular suscripción con su organización (para que el admin edite el plan por cliente)
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS organizacion_id uuid REFERENCES organizaciones(id);

-- Backfill
UPDATE org_usuarios ou SET email = u.email FROM auth.users u
  WHERE ou.user_id = u.id AND ou.email IS NULL;
UPDATE suscripciones s SET organizacion_id = ou.organizacion_id
  FROM org_usuarios ou JOIN auth.users u ON u.id = ou.user_id
  WHERE u.email = s.email AND s.organizacion_id IS NULL;
