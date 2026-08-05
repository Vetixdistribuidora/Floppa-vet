-- ============================================================================
--  Bucket "precios" — imágenes/PDF del nomenclador (precios del mes) por clínica.
--  Privado: cada organización ve solo su carpeta ({org_id}/...). Se accede con
--  URLs firmadas. Cualquier miembro de la org puede subir/borrar (para actualizar
--  el nomenclador cada mes).
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('precios', 'precios', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "precios_org_read" ON storage.objects;
CREATE POLICY "precios_org_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'precios' AND (storage.foldername(name))[1] = get_my_org_id()::text);

DROP POLICY IF EXISTS "precios_org_write" ON storage.objects;
CREATE POLICY "precios_org_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'precios' AND (storage.foldername(name))[1] = get_my_org_id()::text);

DROP POLICY IF EXISTS "precios_org_update" ON storage.objects;
CREATE POLICY "precios_org_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'precios' AND (storage.foldername(name))[1] = get_my_org_id()::text);

DROP POLICY IF EXISTS "precios_org_delete" ON storage.objects;
CREATE POLICY "precios_org_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'precios' AND (storage.foldername(name))[1] = get_my_org_id()::text);
