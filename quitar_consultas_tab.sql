-- Historia Clínica deja de ser pestaña: ahora se entra desde cada paciente.
-- Quita "consultas" del menú de las organizaciones veterinarias existentes.
UPDATE organizaciones
SET modulos = COALESCE(
  (SELECT jsonb_agg(x) FROM jsonb_array_elements_text(modulos) AS t(x) WHERE x <> 'consultas'),
  '[]'::jsonb)
WHERE rubro = 'veterinaria' AND modulos ? 'consultas';
