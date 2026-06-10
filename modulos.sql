-- ============================================================================
--  MODULARIDAD — rubro + módulos activos por organización
-- ============================================================================

ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS rubro text NOT NULL DEFAULT 'distribuidora';
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS modulos jsonb;

-- Backfill: las organizaciones existentes arrancan con el set completo de distribuidora
UPDATE organizaciones
SET modulos = '["productos","clientes","ventas","proveedores","compras","cuentas","caja","reportes","deudores","cheques","mermas","pedidos","tienda-online"]'::jsonb
WHERE modulos IS NULL;
