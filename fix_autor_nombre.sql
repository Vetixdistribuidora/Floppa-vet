-- ============================================================================
--  FIX: el reetiquetado de autor no tomaba efecto por DOS motivos:
--   1) el trigger tg_set_autor forzaba NEW.creado_por := OLD.creado_por en cada
--      UPDATE, revirtiendo cualquier cambio de autor.
--   2) la función leía email/org con auth.email()/get_my_org_id() que podían venir
--      NULL; ahora los lee de org_usuarios por auth.uid().
--  Incluye backfill de los registros ya cargados con el email.
-- ============================================================================

-- 1) Trigger: en UPDATE ya NO pisa creado_por (los updates normales de la app no
--    tocan esa columna, así que sigue conservando el autor original; pero un
--    relabel explícito ahora sí puede cambiarlo). actualizado_por solo se pisa si
--    hay un autor de sesión (no lo borra en updates de servicio/backfill).
CREATE OR REPLACE FUNCTION tg_set_autor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_autor text;
BEGIN
  SELECT NULLIF(btrim(nombre_visible), '') INTO v_autor
    FROM org_usuarios WHERE user_id = auth.uid()
    ORDER BY (nombre_visible IS NOT NULL) DESC
    LIMIT 1;
  v_autor := COALESCE(v_autor, auth.email());

  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := v_autor;
    NEW.actualizado_por := v_autor;
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_autor IS NOT NULL THEN
      NEW.actualizado_por := v_autor;
    END IF;
    -- creado_por se deja como venga: los updates de la app no lo mandan
    -- (queda igual), y un relabel explícito puede cambiarlo.
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Función para setear el nombre visible (email/org desde org_usuarios por uid).
CREATE OR REPLACE FUNCTION set_mi_nombre_visible(p_nombre text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_org   uuid;
  v_old   text;
  v_new   text := NULLIF(btrim(p_nombre), '');
  v_dest  text;
  t       text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT email, organizacion_id, NULLIF(btrim(nombre_visible), '')
    INTO v_email, v_org, v_old
    FROM org_usuarios WHERE user_id = v_uid LIMIT 1;

  UPDATE org_usuarios SET nombre_visible = v_new WHERE user_id = v_uid;

  v_dest := COALESCE(v_new, v_email, auth.email());

  IF v_org IS NOT NULL THEN
    FOREACH t IN ARRAY ARRAY['pacientes','consultas','internaciones','internacion_registros','estudios','recordatorios','cirugias'] LOOP
      IF v_email IS NOT NULL THEN
        EXECUTE format('UPDATE %I SET creado_por = $1 WHERE organizacion_id = $2 AND creado_por = $3', t) USING v_dest, v_org, v_email;
        EXECUTE format('UPDATE %I SET actualizado_por = $1 WHERE organizacion_id = $2 AND actualizado_por = $3', t) USING v_dest, v_org, v_email;
      END IF;
      IF v_old IS NOT NULL THEN
        EXECUTE format('UPDATE %I SET creado_por = $1 WHERE organizacion_id = $2 AND creado_por = $3', t) USING v_dest, v_org, v_old;
        EXECUTE format('UPDATE %I SET actualizado_por = $1 WHERE organizacion_id = $2 AND actualizado_por = $3', t) USING v_dest, v_org, v_old;
      END IF;
    END LOOP;
  END IF;

  RETURN v_dest;
END;
$$;

-- 3) Backfill único: convertir a nombre los registros que figuran con el email
--    de cada usuario que ya tiene nombre_visible (dentro de su organización).
DO $$
DECLARE
  u RECORD;
  t TEXT;
BEGIN
  FOR u IN
    SELECT organizacion_id, email, NULLIF(btrim(nombre_visible), '') AS nom
    FROM org_usuarios
    WHERE NULLIF(btrim(nombre_visible), '') IS NOT NULL AND email IS NOT NULL
  LOOP
    FOREACH t IN ARRAY ARRAY['pacientes','consultas','internaciones','internacion_registros','estudios','recordatorios','cirugias'] LOOP
      EXECUTE format('UPDATE %I SET creado_por = $1 WHERE organizacion_id = $2 AND creado_por = $3', t) USING u.nom, u.organizacion_id, u.email;
      EXECUTE format('UPDATE %I SET actualizado_por = $1 WHERE organizacion_id = $2 AND actualizado_por = $3', t) USING u.nom, u.organizacion_id, u.email;
    END LOOP;
  END LOOP;
END $$;
