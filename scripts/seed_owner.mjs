// ─────────────────────────────────────────────────────────────────────────────
// seed_owner.mjs — Deja la base NUEVA lista para usar:
//   1. Crea (o reutiliza) el usuario OWNER en Supabase Auth, ya confirmado.
//   2. Siembra la tabla `planes` (id=1).
//   3. Crea una organización demo y la vincula al owner.
//   4. Crea la fila owner en `suscripciones`.
//
// Uso:  node scripts/seed_owner.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs"
import pg from "pg"

const OWNER_EMAIL = "santiagozabalegui@gmail.com"
const OWNER_PASS  = "Floppa.demo.2026"
const ORG_NOMBRE  = "Distribuidora Demo"

// ── Leer .env.local y .dburls.local ─────────────────────────────────────────
const parseEnv = (f) => Object.fromEntries(
  readFileSync(new URL(f, import.meta.url), "utf8")
    .split(/\r?\n/).filter(l => l && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const env = parseEnv("../.env.local")
const dbs = parseEnv("../.dburls.local")
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const SROLE  = env.SUPABASE_SERVICE_ROLE_KEY

// ── 1. Crear / recuperar usuario owner ──────────────────────────────────────
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()

let userId
const existing = await c.query("SELECT id FROM auth.users WHERE email = $1", [OWNER_EMAIL])
if (existing.rows.length) {
  userId = existing.rows[0].id
  console.log("Usuario owner ya existía:", userId)
} else {
  const res = await fetch(`${URL_SB}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASS, email_confirm: true }),
  })
  const j = await res.json()
  if (!res.ok) { console.error("Error creando usuario:", j); process.exit(1) }
  userId = j.id
  console.log("Usuario owner creado:", userId, "| pass:", OWNER_PASS)
}

// ── 2. Sembrar planes ───────────────────────────────────────────────────────
await c.query(`
  INSERT INTO planes (id, nombre, precio, descripcion, activo)
  VALUES (1, 'Mensual', 0, 'Plan inicial — gratis por ahora', true)
  ON CONFLICT (id) DO NOTHING`)

// ── 3. Organización demo + vínculo ──────────────────────────────────────────
let orgId
const orgRow = await c.query(
  "SELECT o.id FROM organizaciones o JOIN org_usuarios u ON u.organizacion_id = o.id WHERE u.user_id = $1 LIMIT 1",
  [userId])
if (orgRow.rows.length) {
  orgId = orgRow.rows[0].id
  console.log("Organización ya vinculada:", orgId)
} else {
  orgId = (await c.query("INSERT INTO organizaciones (nombre) VALUES ($1) RETURNING id", [ORG_NOMBRE])).rows[0].id
  await c.query(
    "INSERT INTO org_usuarios (user_id, organizacion_id, rol) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING",
    [userId, orgId])
  console.log("Organización creada:", orgId)
}

// ── 4. Suscripción owner ────────────────────────────────────────────────────
await c.query(`
  INSERT INTO suscripciones (email, nombre_negocio, plan_id, estado, fecha_inicio)
  VALUES ($1, $2, 1, 'owner', CURRENT_DATE)
  ON CONFLICT (email) DO UPDATE SET estado = 'owner'`,
  [OWNER_EMAIL, ORG_NOMBRE])

await c.end()
console.log("\n✅ Base lista. Login:", OWNER_EMAIL, "/", OWNER_PASS)
