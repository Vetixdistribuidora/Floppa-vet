-- ============================================================================
--  NUMERACIÓN POR ORGANIZACIÓN + EDITABLE
--  Antes: get_next_nro_* usaban SECUENCIAS GLOBALES (compartidas entre todos los
--  clientes) y no se podían editar. Ahora cada organización tiene su propio
--  contador, editable desde Configuración (para continuar la numeración del
--  negocio viejo). Aplica a ventas/facturas (nro_factura), recibos y notas de
--  crédito; y por ende a presupuestos/remitos/reimpresiones (leen nro_factura).
--  Aplicar con:  node scripts/run_sql.mjs numeracion_por_org.sql
-- ============================================================================

-- 1) Contadores por organización (el "próximo número" a asignar)
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS next_nro_factura bigint NOT NULL DEFAULT 1;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS next_nro_recibo  bigint NOT NULL DEFAULT 1;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS next_nro_nota    bigint NOT NULL DEFAULT 1;

-- 2) Inicializar cada contador = (máximo existente en esa org) + 1
--    para continuar sin saltos ni choques con lo ya emitido.
UPDATE organizaciones o SET next_nro_factura = greatest(o.next_nro_factura, coalesce((
    SELECT max((v.nro_factura)::bigint) FROM ventas v
    WHERE v.organizacion_id = o.id AND v.nro_factura ~ '^[0-9]+$'
  ), 0) + 1);

UPDATE organizaciones o SET next_nro_nota = greatest(o.next_nro_nota, coalesce((
    SELECT max((substring(n.nro_nota from '(\d+)$'))::bigint) FROM notas_credito n
    WHERE n.organizacion_id = o.id AND n.nro_nota ~ '\d'
  ), 0) + 1);

UPDATE organizaciones o SET next_nro_recibo = greatest(o.next_nro_recibo, coalesce((
    SELECT max((substring(p.nro_recibo from '(\d+)$'))::bigint) FROM pagos_cuenta_corriente p
    WHERE p.organizacion_id = o.id AND p.nro_recibo ~ '\d'
  ), 0) + 1);

-- 3) Redefinir las funciones: toman e incrementan el contador de la org (atómico).
--    Devuelven el número a usar (el contador ANTES de incrementar).
CREATE OR REPLACE FUNCTION public.get_next_nro_factura() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v bigint; BEGIN
  UPDATE organizaciones SET next_nro_factura = next_nro_factura + 1
    WHERE id = get_my_org_id() RETURNING next_nro_factura - 1 INTO v;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_nro_recibo() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v bigint; BEGIN
  UPDATE organizaciones SET next_nro_recibo = next_nro_recibo + 1
    WHERE id = get_my_org_id() RETURNING next_nro_recibo - 1 INTO v;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_nro_nota() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v bigint; BEGIN
  UPDATE organizaciones SET next_nro_nota = next_nro_nota + 1
    WHERE id = get_my_org_id() RETURNING next_nro_nota - 1 INTO v;
  RETURN v;
END $$;

-- 4) Uniques de número: de GLOBAL a POR-ORGANIZACIÓN.
ALTER TABLE facturas_impresion DROP CONSTRAINT IF EXISTS facturas_impresion_nro_unique;
ALTER TABLE facturas_impresion ADD  CONSTRAINT facturas_impresion_nro_org_unique UNIQUE (organizacion_id, nro_factura);

ALTER TABLE notas_credito DROP CONSTRAINT IF EXISTS notas_credito_nro_nota_key;
ALTER TABLE notas_credito ADD  CONSTRAINT notas_credito_nro_nota_org_unique UNIQUE (organizacion_id, nro_nota);
