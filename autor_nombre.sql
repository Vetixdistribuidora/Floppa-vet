-- ============================================================================
--  Nombre visible del autor: en vez del mail, mostrar el nombre que cada
--  usuario configura (ej. "Dr. Santiago Zabalegui") en creado_por/actualizado_por.
-- ============================================================================

-- 1) Cada usuario tiene un nombre visible (opcional). Si está vacío, se usa el mail.
ALTER TABLE org_usuarios ADD COLUMN IF NOT EXISTS nombre_visible text;

-- 2) El trigger de autoría escribe el nombre visible del usuario logueado
--    (con fallback al email si no configuró ninguno).
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
    NEW.creado_por := OLD.creado_por;   -- se conserva el autor original
    NEW.actualizado_por := v_autor;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Cada usuario setea su propio nombre visible. La función también actualiza
--    sus registros clínicos ya cargados (los que figuran con su mail o su nombre
--    anterior), acotado a su organización. Devuelve el valor que quedará visible.
CREATE OR REPLACE FUNCTION set_mi_nombre_visible(p_nombre text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text := auth.email();
  v_org   uuid := get_my_org_id();
  v_old   text;
  v_new   text := NULLIF(btrim(p_nombre), '');
  v_dest  text;
  t       text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT NULLIF(btrim(nombre_visible), '') INTO v_old FROM org_usuarios WHERE user_id = v_uid LIMIT 1;
  UPDATE org_usuarios SET nombre_visible = v_new WHERE user_id = v_uid;

  v_dest := COALESCE(v_new, v_email);  -- qué mostrar de acá en más

  -- Reetiquetar registros existentes de esta organización que me pertenecen.
  FOREACH t IN ARRAY ARRAY['pacientes','consultas','internaciones','internacion_registros','estudios','recordatorios','cirugias'] LOOP
    EXECUTE format(
      'UPDATE %I SET creado_por = $1
         WHERE organizacion_id = $2 AND (creado_por = $3 OR ($4 IS NOT NULL AND creado_por = $4))', t)
      USING v_dest, v_org, v_email, v_old;
    EXECUTE format(
      'UPDATE %I SET actualizado_por = $1
         WHERE organizacion_id = $2 AND (actualizado_por = $3 OR ($4 IS NOT NULL AND actualizado_por = $4))', t)
      USING v_dest, v_org, v_email, v_old;
  END LOOP;

  RETURN v_dest;
END;
$$;

GRANT EXECUTE ON FUNCTION set_mi_nombre_visible(text) TO authenticated;
