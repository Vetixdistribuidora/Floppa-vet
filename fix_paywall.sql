-- ============================================================================
--  PAYWALL: impedir que un cliente se auto-active o se auto-asigne módulos.
--  El dueño de la plataforma (email) y el service_role (panel admin / API) sí pueden.
--  Son triggers BEFORE UPDATE que "preservan" los valores sensibles para clientes.
-- ============================================================================

-- ¿La operación la hace el dueño de la plataforma o el service_role?
CREATE OR REPLACE FUNCTION public._es_plataforma() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.role() = 'service_role', false)
      OR coalesce(auth.email() = 'santiagozabalegui@gmail.com', false);
$$;

-- ── organizaciones: el cliente NO puede cambiar modulos ni rubro una vez seteados ──
CREATE OR REPLACE FUNCTION public._proteger_org() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT _es_plataforma() THEN
    -- Permitir el seteo inicial (org recién creada en onboarding), pero no cambios posteriores
    IF OLD.rubro   IS NOT NULL THEN NEW.rubro   := OLD.rubro;   END IF;
    IF OLD.modulos IS NOT NULL THEN NEW.modulos := OLD.modulos; END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_proteger_org ON organizaciones;
CREATE TRIGGER tg_proteger_org BEFORE UPDATE ON organizaciones
  FOR EACH ROW EXECUTE FUNCTION _proteger_org();

-- ── suscripciones: el cliente NO puede tocar estado/plan/precio/vencimiento ──
CREATE OR REPLACE FUNCTION public._proteger_susc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT _es_plataforma() THEN
    NEW.estado            := OLD.estado;
    NEW.plan_id           := OLD.plan_id;
    NEW.precio_custom     := OLD.precio_custom;
    NEW.fecha_inicio      := OLD.fecha_inicio;
    NEW.fecha_vencimiento := OLD.fecha_vencimiento;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_proteger_susc ON suscripciones;
CREATE TRIGGER tg_proteger_susc BEFORE UPDATE ON suscripciones
  FOR EACH ROW EXECUTE FUNCTION _proteger_susc();
