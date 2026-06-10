-- ============================================================================
--  PLANES POR RUBRO — un plan con su precio mensual por cada rubro
-- ============================================================================

ALTER TABLE planes ADD COLUMN IF NOT EXISTS rubro text;

-- Plan 1 = Distribuidora (ya existía como "Mensual")
UPDATE planes
SET nombre = 'Distribuidora', precio = 60000,
    descripcion = 'Todos los módulos para distribuidoras y mayoristas',
    rubro = 'distribuidora', activo = true
WHERE id = 1;

-- Veterinaria y Comercio general
INSERT INTO planes (id, nombre, precio, descripcion, activo, rubro) VALUES
  (2, 'Veterinaria',      75000, 'Incluye módulos veterinarios (pacientes, consultas, recordatorios)', true, 'veterinaria'),
  (3, 'Comercio general', 40000, 'Lo esencial para un comercio',                                       true, 'general')
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre, precio = EXCLUDED.precio,
      descripcion = EXCLUDED.descripcion, activo = true, rubro = EXCLUDED.rubro;

-- Alinear la secuencia de id si existe (para futuros INSERT sin id explícito)
DO $$ BEGIN
  IF pg_get_serial_sequence('planes','id') IS NOT NULL THEN
    PERFORM setval(pg_get_serial_sequence('planes','id'), GREATEST((SELECT MAX(id) FROM planes), 3));
  END IF;
END $$;
