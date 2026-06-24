# Flop

Sistema de gestión multi-rubro (distribuidoras, veterinarias, comercios) construido como SaaS multicuenta. Next.js 16 (App Router) + Supabase (Postgres con RLS) + Vercel.

Cada cliente es una **organización** aislada por `organizacion_id` con Row Level Security. Los módulos visibles se configuran por rubro y por rol (admin / veterinario / recepción).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
```

### Variables de entorno (`.env.local`)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del proyecto Supabase (`https://<ref>.supabase.co`, **sin** `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server: APIs `/api/*`) |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej. `https://floppa-vet.vercel.app`) |
| `NEXT_PUBLIC_OWNER_EMAIL` | Email del dueño de la plataforma (ve `/admin`) |
| `MP_ACCESS_TOKEN_PROD` / `MP_ACCESS_TOKEN_TEST` | Access token de MercadoPago (prod / pruebas) |
| `MP_WEBHOOK_SECRET` | Secreto de la app MP para validar la firma del webhook (opcional pero recomendado) |
| `RESEND_API_KEY` / `RESEND_FROM` | Envío de mails (recordatorios, cumpleaños). `RESEND_FROM` necesita dominio verificado para mandar a terceros |
| `CRON_SECRET` | Protege el cron diario `/api/cron/recordatorios` |

## Base de datos

El esquema y las políticas RLS están en los `.sql` de la raíz. Para aplicar una migración:

```bash
node scripts/run_sql.mjs <archivo.sql>
```

Migraciones clave: `migration_multitenant.sql` (multitenancy + RLS), `fase_b_seguridad.sql` (aislamiento), `fix_paywall.sql` (el cliente no puede auto-activarse), `paywall_acceso.sql` (el equipo puede leer la suscripción de su org para el gate de vencimiento).

## Cobro / suscripciones

- Onboarding crea una suscripción **trial** (15 días) con el plan del rubro.
- Al vencer, el layout bloquea el acceso (paywall) hasta reactivar desde **Configuración**.
- Pago recurrente con MercadoPago (`/api/mp/crear-link` → preapproval; `/api/webhook/mercadopago` actualiza el estado).

## Nota de build (Next 16)

`next build` puede fallar **localmente en Windows** al prerenderizar la página interna `/_global-error` con un `InvariantError` (bug conocido de Next 16, no del código de la app: ver [vercel/next.js#87719](https://github.com/vercel/next.js/issues/87719)). El build en Vercel (Linux) no se ve afectado. Las rutas de la app se fuerzan a dinámicas desde el root layout (Server Component), así que no se prerenderizan.
