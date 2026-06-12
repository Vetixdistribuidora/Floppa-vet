ALTER TABLE consultas  ADD COLUMN IF NOT EXISTS para_cobrar text;
ALTER TABLE consultas  ADD COLUMN IF NOT EXISTS cobrado boolean NOT NULL DEFAULT false;
ALTER TABLE pacientes  ADD COLUMN IF NOT EXISTS etiquetas text[] DEFAULT '{}';
