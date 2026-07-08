-- ============================================================================
--  Borrado restringido a admin (RLS) en tablas clínicas veterinarias.
--  SELECT/INSERT/UPDATE: todo el equipo de la organización (como antes).
--  DELETE: solo si el usuario es admin (org_usuarios.rol = 'admin') de su org.
--  Protección real a nivel de base de datos (no solo UI): aunque haya un bug
--  de frontend o alguien llame la API directo, Postgres rechaza el borrado.
-- ============================================================================

CREATE OR REPLACE FUNCTION es_admin_de_mi_org()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_usuarios
    WHERE user_id = auth.uid() AND rol = 'admin'
  );
$$;

DO $$
DECLARE
  -- sala_espera y turnos quedan afuera a propósito: son operativa diaria
  -- (cola de espera, agenda), no historia clínica — recepción los borra normal.
  tablas TEXT[] := ARRAY['pacientes', 'consultas', 'internaciones', 'internacion_registros', 'estudios', 'recordatorios'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_insert ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_update ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_delete ON %I', t);

    EXECUTE format(
      'CREATE POLICY org_isolation_select ON %I FOR SELECT TO authenticated
       USING (organizacion_id = get_my_org_id())', t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_insert ON %I FOR INSERT TO authenticated
       WITH CHECK (organizacion_id = get_my_org_id())', t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_update ON %I FOR UPDATE TO authenticated
       USING (organizacion_id = get_my_org_id())
       WITH CHECK (organizacion_id = get_my_org_id())', t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_delete ON %I FOR DELETE TO authenticated
       USING (organizacion_id = get_my_org_id() AND es_admin_de_mi_org())', t
    );
  END LOOP;
END $$;

-- Storage: borrar archivos de estudios también queda restringido a admin.
DROP POLICY IF EXISTS "estudios_delete" ON storage.objects;
CREATE POLICY "estudios_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'estudios' AND (storage.foldername(name))[1] = get_my_org_id()::text AND es_admin_de_mi_org());
