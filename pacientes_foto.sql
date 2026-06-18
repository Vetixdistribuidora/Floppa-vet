-- Foto del paciente: columna + bucket de storage público (lectura pública,
-- escritura autenticada). Mismo enfoque que el bucket "productos".
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS imagen_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pacientes', 'pacientes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pacientes_public_read" ON storage.objects;
CREATE POLICY "pacientes_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pacientes');

DROP POLICY IF EXISTS "pacientes_auth_write" ON storage.objects;
CREATE POLICY "pacientes_auth_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pacientes');

DROP POLICY IF EXISTS "pacientes_auth_update" ON storage.objects;
CREATE POLICY "pacientes_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pacientes');

DROP POLICY IF EXISTS "pacientes_auth_delete" ON storage.objects;
CREATE POLICY "pacientes_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pacientes');
