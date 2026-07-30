-- Sala de espera: veterinario elegido por el tutor + número de orden (ticket físico).
ALTER TABLE sala_espera ADD COLUMN IF NOT EXISTS veterinario  text;
ALTER TABLE sala_espera ADD COLUMN IF NOT EXISTS numero_orden int;
