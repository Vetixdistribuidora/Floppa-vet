-- Vincula la venta con la pre-venta (consulta) de la que salió, para que al anular
-- la venta la pre-venta vuelva a "pendiente" automáticamente.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS consulta_id bigint REFERENCES consultas(id) ON DELETE SET NULL;
