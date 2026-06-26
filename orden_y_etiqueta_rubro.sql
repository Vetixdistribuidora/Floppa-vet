-- ============================================================================
--  Personalización por organización:
--   - orden_modulos:  orden preferido de las pestañas del menú (array de keys).
--                     Si es null, se usa el orden por defecto (MODULOS).
--   - rubro_display:  qué etiqueta de rubro mostrar bajo el nombre del negocio
--                     (ej: una org "personalizado" puede mostrarse como "veterinaria").
--                     Si es null, se muestra el rubro real.
-- ============================================================================
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS orden_modulos jsonb;
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS rubro_display text;
