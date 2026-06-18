-- Bucket para fotos de productos (faltaba en la base de Floppa: la subida de foto
-- de productos fallaba con "Bucket not found"). Público en lectura, escritura auth.
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "productos_public_read" ON storage.objects;
CREATE POLICY "productos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "productos_auth_write" ON storage.objects;
CREATE POLICY "productos_auth_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'productos');

DROP POLICY IF EXISTS "productos_auth_update" ON storage.objects;
CREATE POLICY "productos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "productos_auth_delete" ON storage.objects;
CREATE POLICY "productos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'productos');
