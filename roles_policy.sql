-- org_usuarios: los miembros pueden VER al equipo de su organización; escribir solo su propia fila
DROP POLICY IF EXISTS org_usuarios_isolation ON org_usuarios;
DROP POLICY IF EXISTS org_usuarios_select ON org_usuarios;
DROP POLICY IF EXISTS org_usuarios_self ON org_usuarios;
CREATE POLICY org_usuarios_select ON org_usuarios FOR SELECT TO authenticated
  USING (organizacion_id = get_my_org_id());
CREATE POLICY org_usuarios_self ON org_usuarios FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
