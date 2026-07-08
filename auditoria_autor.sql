-- ============================================================================
--  Autoría automática: quién creó / modificó cada registro clínico.
--  Se guarda el email del usuario logueado (auth.email()) en creado_por al
--  insertar, y en actualizado_por en cada insert/update. creado_por nunca se
--  pisa en un UPDATE (se conserva el autor original).
-- ============================================================================

CREATE OR REPLACE FUNCTION tg_set_autor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := auth.email();
    NEW.actualizado_por := auth.email();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.creado_por := OLD.creado_por;
    NEW.actualizado_por := auth.email();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tablas TEXT[] := ARRAY['pacientes', 'consultas', 'internaciones', 'internacion_registros', 'estudios', 'recordatorios'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS creado_por text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS actualizado_por text', t);
    EXECUTE format('DROP TRIGGER IF EXISTS tg_autor ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER tg_autor BEFORE INSERT OR UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION tg_set_autor()', t
    );
  END LOOP;
END $$;
