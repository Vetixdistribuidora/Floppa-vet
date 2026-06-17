-- Agrega los módulos nuevos (turnos, internacion) a las organizaciones
-- veterinarias existentes, sin duplicar. El preset solo aplica a cuentas nuevas.
UPDATE organizaciones
SET modulos = modulos
  || (CASE WHEN modulos ? 'turnos'      THEN '[]'::jsonb ELSE '["turnos"]'::jsonb END)
  || (CASE WHEN modulos ? 'internacion' THEN '[]'::jsonb ELSE '["internacion"]'::jsonb END)
WHERE rubro = 'veterinaria';
