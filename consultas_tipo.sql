ALTER TABLE consultas ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'consulta';
UPDATE consultas SET tipo='consulta' WHERE tipo IS NULL;
