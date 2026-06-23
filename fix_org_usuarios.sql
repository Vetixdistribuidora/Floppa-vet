-- SEGURIDAD: la política org_usuarios_self era ALL (permitía UPDATE), así un usuario
-- podía reasignarse a OTRA organización (cambiar su organizacion_id) y ver datos ajenos.
-- Se reemplaza por solo-lectura de la fila propia. Las altas/cambios de membresía van
-- por crear_organizacion (SECURITY DEFINER) y /api/usuarios (service role), que no
-- dependen de esta política.
DROP POLICY IF EXISTS org_usuarios_self ON org_usuarios;
CREATE POLICY org_usuarios_self_select ON org_usuarios
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Defensa en profundidad: el rol authenticated no necesita escribir esta tabla.
REVOKE INSERT, UPDATE, DELETE ON org_usuarios FROM authenticated;
