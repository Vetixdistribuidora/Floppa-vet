-- ============================================================================
--  Cirugías a pacientes NO registrados (aislados) + monto opcional.
--  Los datos del paciente/propietario externo se guardan pegados al registro
--  (no se crean cliente/paciente para no ensuciar las listas).
-- ============================================================================
ALTER TABLE cirugias
  ADD COLUMN IF NOT EXISTS paciente_libre        text,
  ADD COLUMN IF NOT EXISTS especie               text,
  ADD COLUMN IF NOT EXISTS raza                  text,
  ADD COLUMN IF NOT EXISTS edad                  text,
  ADD COLUMN IF NOT EXISTS sexo                  text,
  ADD COLUMN IF NOT EXISTS propietario_nombre    text,
  ADD COLUMN IF NOT EXISTS propietario_apellido  text,
  ADD COLUMN IF NOT EXISTS propietario_telefono  text,
  ADD COLUMN IF NOT EXISTS monto                 numeric(12,2);

ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS paciente_libre        text,
  ADD COLUMN IF NOT EXISTS especie               text,
  ADD COLUMN IF NOT EXISTS raza                  text,
  ADD COLUMN IF NOT EXISTS edad                  text,
  ADD COLUMN IF NOT EXISTS sexo                  text,
  ADD COLUMN IF NOT EXISTS propietario_nombre    text,
  ADD COLUMN IF NOT EXISTS propietario_apellido  text,
  ADD COLUMN IF NOT EXISTS propietario_telefono  text,
  ADD COLUMN IF NOT EXISTS monto                 numeric(12,2);
