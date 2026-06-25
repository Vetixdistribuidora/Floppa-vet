-- ============================================================================
--  FIX: crear_organizacion no guardaba el email del dueño en org_usuarios,
--  así toda cuenta nueva aparecía como "(sin email)" en Usuarios del equipo.
--  Ahora lo guarda (desde auth.users) + backfill de los que quedaron sin email.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crear_organizacion(p_nombre text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_org_id  UUID;
  v_user_id UUID;
  v_email   text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF EXISTS (SELECT 1 FROM org_usuarios WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Este usuario ya tiene una organización';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO organizaciones (nombre) VALUES (p_nombre) RETURNING id INTO v_org_id;
  INSERT INTO org_usuarios (user_id, organizacion_id, rol, email)
    VALUES (v_user_id, v_org_id, 'admin', v_email);

  RETURN v_org_id;
END;
$$;

-- Backfill de las membresías que quedaron sin email
UPDATE org_usuarios ou SET email = u.email
  FROM auth.users u
  WHERE ou.user_id = u.id AND ou.email IS NULL;
