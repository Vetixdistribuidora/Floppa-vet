-- Número/identificador de jaula donde se interna el paciente.
ALTER TABLE internaciones ADD COLUMN IF NOT EXISTS jaula text;
