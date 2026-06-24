-- ============================================================================
--  PAYWALL (acceso): que TODO el equipo de una organización pueda LEER la
--  suscripción de su org (no solo el dueño por email). El layout usa esto para
--  bloquear el acceso cuando la suscripción está vencida.
--
--  Contexto: la RLS vieja de `suscripciones` solo dejaba ver la fila al dueño
--  (auth.email() = email). Una secretaria/recepción (otro email) no veía nada,
--  así que el gate de vencimiento no podía evaluarse para ella.
--
--  Aplicar con:  node scripts/run_sql.mjs paywall_acceso.sql
-- ============================================================================

-- Lectura de la suscripción para cualquier miembro de la organización.
DROP POLICY IF EXISTS suscripcion_equipo_ve ON public.suscripciones;
CREATE POLICY suscripcion_equipo_ve ON public.suscripciones
  FOR SELECT TO authenticated
  USING (organizacion_id = public.get_my_org_id());

-- Defensa en profundidad: el cliente NO puede escribir directamente esta tabla
-- (alta/cambios van por onboarding, /api/mp y el webhook, todos service_role o
--  el propio dueño vía las policies existentes). Los triggers de fix_paywall.sql
--  ya impiden tocar estado/plan/precio/vencimiento; esto sería el cinturón extra.
--  (Se deja comentado para no romper el alta de trial del onboarding por el dueño.)
-- REVOKE INSERT, UPDATE, DELETE ON public.suscripciones FROM authenticated;
