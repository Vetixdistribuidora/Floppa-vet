-- Deceso de pacientes: marca fallecido para excluir de recordatorios/turnos.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS fallecido boolean NOT NULL DEFAULT false;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS fecha_deceso date;
