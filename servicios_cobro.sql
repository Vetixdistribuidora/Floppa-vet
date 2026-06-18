-- Productos que son servicios (consulta, inyectable, etc.): se venden sin stock
-- y no figuran como "sin stock".
ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_servicio boolean NOT NULL DEFAULT false;

-- "A cobrar" estructurado: lista de productos elegidos en la consulta para
-- precargar la venta sin tipear.
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS cobrar_items jsonb;
