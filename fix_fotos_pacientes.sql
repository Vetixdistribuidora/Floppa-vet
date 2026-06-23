-- Fotos de pacientes PRIVADAS y aisladas por organización (como los estudios).
-- El archivo vive en una carpeta con el id de la organización y solo esa org accede.
UPDATE storage.buckets SET public = false WHERE id = 'pacientes';

DROP POLICY IF EXISTS "pacientes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "pacientes_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "pacientes_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "pacientes_auth_delete" ON storage.objects;

CREATE POLICY "pacientes_org_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pacientes' AND (storage.foldername(name))[1] = (get_my_org_id())::text);
CREATE POLICY "pacientes_org_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pacientes' AND (storage.foldername(name))[1] = (get_my_org_id())::text);
CREATE POLICY "pacientes_org_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pacientes' AND (storage.foldername(name))[1] = (get_my_org_id())::text);
CREATE POLICY "pacientes_org_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pacientes' AND (storage.foldername(name))[1] = (get_my_org_id())::text);
