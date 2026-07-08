-- ============================================================================
--  Ajuste de alcance: sala_espera y turnos NO son "historia clínica" sino
--  operativa diaria (cola de espera, agenda) — recepción necesita poder
--  borrar ahí sin pedirle al admin. Se revierten a la política original
--  (org_isolation FOR ALL, sin restricción de rol en el DELETE).
-- ============================================================================
DO $$
DECLARE
  tablas TEXT[] := ARRAY['sala_espera', 'turnos'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_insert ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_update ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_delete ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY org_isolation ON %I FOR ALL TO authenticated
       USING (organizacion_id = get_my_org_id())
       WITH CHECK (organizacion_id = get_my_org_id())', t
    );
  END LOOP;
END $$;
