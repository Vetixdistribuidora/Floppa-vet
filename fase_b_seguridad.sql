-- ============================================================================
--  FASE B — Aislamiento multi-tenant y limpieza de RLS
--  Idempotente. Se aplica sobre la base NUEVA de Floppa.
-- ============================================================================

-- ── 1. Agregar organizacion_id + trigger a tablas tenant que no lo tienen ────
DO $outer$
DECLARE
  t text;
  faltan text[] := ARRAY[
    'borradores','cheques','cuenta_corriente','mermas','notas_credito',
    'pedidos','pedido_items','pedidos_items','saldo_clientes'
  ];
BEGIN
  FOREACH t IN ARRAY faltan LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organizacion_id uuid REFERENCES organizaciones(id)', t);
    EXECUTE format('DROP TRIGGER IF EXISTS tg_set_org_id ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER tg_set_org_id BEFORE INSERT ON public.%I
       FOR EACH ROW EXECUTE FUNCTION _set_org_id()', t);
  END LOOP;
END
$outer$;

-- ── 1b. Backfill: si hay exactamente UNA organización, etiquetar filas sueltas
DO $outer$
DECLARE
  v_org uuid;
  t text;
  tablas text[] := ARRAY[
    'borradores','cheques','cuenta_corriente','mermas','notas_credito',
    'pedidos','pedido_items','pedidos_items','saldo_clientes'
  ];
BEGIN
  IF (SELECT count(*) FROM organizaciones) = 1 THEN
    SELECT id INTO v_org FROM organizaciones LIMIT 1;
    FOREACH t IN ARRAY tablas LOOP
      EXECUTE format('UPDATE public.%I SET organizacion_id = $1 WHERE organizacion_id IS NULL', t)
        USING v_org;
    END LOOP;
  END IF;
END
$outer$;

-- ── 2. Limpiar TODAS las políticas y dejar solo org_isolation en tablas tenant
DO $outer$
DECLARE
  t text;
  pol record;
  tenant text[] := ARRAY[
    -- ya tenían organizacion_id
    'auditoria','caja_config','clientes','compras','compras_detalle','compras_pagos',
    'cuentas_corrientes','detalle_ventas','facturas_impresion','lotes','movimientos_caja',
    'pagos_cuenta_corriente','productos','proveedores','saldo_proveedores','ventas',
    -- recién agregadas en el paso 1
    'borradores','cheques','cuenta_corriente','mermas','notas_credito','pedidos',
    'pedido_items','pedidos_items','saldo_clientes'
  ];
BEGIN
  FOREACH t IN ARRAY tenant LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      $pol$CREATE POLICY org_isolation ON public.%I FOR ALL TO authenticated
           USING (organizacion_id = get_my_org_id())
           WITH CHECK (organizacion_id = get_my_org_id())$pol$, t);
  END LOOP;
END
$outer$;

-- ── 3. Tablas especiales (no son datos por-organización) ─────────────────────

-- planes: catálogo global, solo lectura
DROP POLICY IF EXISTS planes_read ON planes;
CREATE POLICY planes_read ON planes FOR SELECT TO authenticated, anon USING (true);

-- suscripciones: cada usuario la suya; el owner ve todas
DO $outer$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='suscripciones' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.suscripciones', pol.policyname);
  END LOOP;
END
$outer$;
CREATE POLICY susc_self ON suscripciones FOR ALL TO authenticated
  USING (auth.email() = email) WITH CHECK (auth.email() = email);
CREATE POLICY susc_owner ON suscripciones FOR ALL TO authenticated
  USING (auth.email() = 'santiagozabalegui@gmail.com') WITH CHECK (true);

-- organizaciones, org_usuarios y tienda_perfiles: ya tienen aislamiento correcto
--   (org_self_access / user_id=auth.uid() / auth.uid()=id). Se dejan como están.

-- ── 4. Reportes RPC: pasar a SECURITY INVOKER → la RLS los filtra por org ─────
ALTER FUNCTION public.dashboard_kpis()        SECURITY INVOKER;
ALTER FUNCTION public.productos_sin_ventas()  SECURITY INVOKER;
ALTER FUNCTION public.productos_sin_rotacion() SECURITY INVOKER;

-- ── 5. Unicidad de nombre de producto: por organización, no global ───────────
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_nombre_unique;
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_nombre_org_unique;
ALTER TABLE productos ADD CONSTRAINT productos_nombre_org_unique UNIQUE (organizacion_id, nombre);
