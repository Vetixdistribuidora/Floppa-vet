// verify_onboarding.mjs — Prueba el flujo de auto-registro/onboarding en el backend:
// usuario nuevo SIN org → crear_organizacion (como él) → suscripción trial → queda aislado.
// Limpia todo al final. Solo toca la base NUEVA.
import { readFileSync } from "node:fs"
import pg from "pg"

const parseEnv = (f) => Object.fromEntries(
  readFileSync(new URL(f, import.meta.url), "utf8").split(/\r?\n/).filter(l => l && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const env = parseEnv("../.env.local"), dbs = parseEnv("../.dburls.local")
const SB = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SROLE = env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = "test-onboarding@floppa.local", PASS = "Test.onboarding.2026"

const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
const rest = (m, p, tok, body) => fetch(`${SB}/rest/v1/${p}`, {
  method: m, headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation" },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async r => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => null) }))

let userId
async function cleanup() {
  try {
    if (userId) {
      await c.query("DELETE FROM org_usuarios WHERE user_id=$1", [userId])
      await c.query("DELETE FROM organizaciones WHERE nombre='Negocio Test Onboarding'")
      await c.query("DELETE FROM suscripciones WHERE email=$1", [EMAIL])
      await fetch(`${SB}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}` } })
    }
  } catch (e) { console.error("cleanup:", e.message) }
  await c.end()
}
const fail = (m) => { console.error("❌ FALLO:", m); cleanup().then(() => process.exit(1)) }

// 1. Crear usuario nuevo confirmado, SIN organización (con metadata nombre_negocio)
const cr = await fetch(`${SB}/auth/v1/admin/users`, {
  method: "POST", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASS, email_confirm: true, user_metadata: { nombre_negocio: "Negocio Test Onboarding" } }),
})
const cj = await cr.json()
userId = cj.id || (await c.query("SELECT id FROM auth.users WHERE email=$1", [EMAIL])).rows[0]?.id
console.log("Usuario nuevo:", userId)

// limpiar restos previos
await c.query("DELETE FROM org_usuarios WHERE user_id=$1", [userId])
await c.query("DELETE FROM suscripciones WHERE email=$1", [EMAIL])
await c.query("DELETE FROM organizaciones WHERE nombre='Negocio Test Onboarding'")

// 2. Login
const tr = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASS }) })
const token = (await tr.json()).access_token
if (!token) fail("no obtuvo token")

// 3. Antes del onboarding: no tiene org (get_my_org_id null → no ve nada)
const antes = await rest("GET", "organizaciones?select=nombre", token)
console.log("Orgs visibles ANTES del onboarding:", antes.data.length, "(debe ser 0 → la app redirige a /onboarding)")
if (antes.data.length !== 0) fail("el usuario nuevo ya veía una org")

// 4. crear_organizacion (lo que hace la pantalla de onboarding)
const rpc = await rest("POST", "rpc/crear_organizacion", token, { p_nombre: "Negocio Test Onboarding" })
if (!rpc.ok) fail("crear_organizacion falló: " + JSON.stringify(rpc.data))
console.log("crear_organizacion OK → org id:", rpc.data)

// 5. suscripción trial (lo que ahora hace el onboarding, ya autenticado)
const venc = new Date(); venc.setDate(venc.getDate() + 15)
const sus = await rest("POST", "suscripciones", token, {
  email: EMAIL, nombre_negocio: "Negocio Test Onboarding", estado: "trial", plan_id: 1,
  fecha_inicio: new Date().toISOString().split("T")[0], fecha_vencimiento: venc.toISOString().split("T")[0] })
if (!sus.ok) fail("no pudo crear suscripción trial (RLS): " + JSON.stringify(sus.data))
console.log("Suscripción trial creada bajo RLS OK")

// 6. Después: ya ve SU org
const despues = await rest("GET", "organizaciones?select=nombre", token)
console.log("Orgs visibles DESPUÉS:", despues.data.length, "→", despues.data.map(o => o.nombre).join(", "))
if (despues.data.length !== 1 || despues.data[0].nombre !== "Negocio Test Onboarding") fail("no quedó con su org correcta")

console.log("\n✅ FLUJO DE ONBOARDING OK: registro → sin org (redirige) → crea org + suscripción trial → queda aislado.")
await cleanup()
console.log("🧹 Usuario/datos de prueba eliminados.")
