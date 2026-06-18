-- Plan Personalizado: combinación a medida, precio premium (ajustable por cliente).
INSERT INTO planes (id, nombre, precio, descripcion, activo, rubro)
SELECT (SELECT COALESCE(MAX(id), 0) + 1 FROM planes), 'Personalizado', 90000, 'Combinación de módulos a medida', true, 'personalizado'
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE rubro = 'personalizado');

-- Mantener la secuencia de id alineada (el clonado la dejó atrás).
SELECT setval(pg_get_serial_sequence('planes', 'id'), (SELECT MAX(id) FROM planes));

-- Precio negociado por cliente: si está, pisa el precio del plan.
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS precio_custom numeric;
