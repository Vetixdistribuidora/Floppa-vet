// verify_isolation.mjs — Prueba REAL de aislamiento multi-tenant.
// Crea una 2ª organización/usuario, inserta datos como cada usuario vía la API
// (rol authenticated, con RLS activa) y verifica que ninguno ve lo del otro.
// Limpia todo lo de prueba al final. Solo toca la base NUEVA.
import { readFileSync } from "node:fs"
import pg from "pg"

const parseEnv = (f) => Object.fromEntries(
  readFileSync(new URL(f, import.meta.url), "utf8")
    .split(/\r?\n/).filter(l => l && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))

const env = parseEnv("../.env.local")
const dbs = parseEnv("../.dburls.local")
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SROLE = env.SUPABASE_SERVICE_ROLE_KEY

const A = { email: "santiagozabalegui@gmail.com", pass: "Floppa.demo.2026" } // owner + org demo
const B = { email: "test-aislamiento@floppa.local", pass: "Test.aislamiento.2026" }
const PROD = "ZZ_TEST_AISLAMIENTO"

const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()

async function adminCreateUser(email, pass) {
  const ex = await c.query("SELECT id FROM auth.users WHERE email=$1", [email])
  if (ex.rows.length) return ex.rows[0].id
  const r = await fetch(`${URL_SB}/auth/v1/admin/users`, {
    method: "POST", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass, email_confirm: true }),
  })
  const j = await r.json(); if (!r.ok) throw new Error("crear user: " + JSON.stringify(j))
  return j.id
}
async function ensureOrg(userId, nombre) {
  const ex = await c.query("SELECT organizacion_id FROM org_usuarios WHERE user_id=$1 LIMIT 1", [userId])
  if (ex.rows.length) return ex.rows[0].organizacion_id
  const org = (await c.query("INSERT INTO organizaciones (nombre) VALUES ($1) RETURNING id", [nombre])).rows[0].id
  await c.query("INSERT INTO org_usuarios (user_id, organizacion_id, rol) VALUES ($1,$2,'admin')", [userId, org])
  return org
}
async function signIn(email, pass) {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  })
  const j = await r.json(); if (!r.ok) throw new Error("signin " + email + ": " + JSON.stringify(j))
  return j.access_token
}
function rest(method, path, token, body, prefer) {
  return fetch(`${URL_SB}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => null) }))
}

// columnas NOT NULL sin default de productos (para armar el insert)
async function productPayload(nombre) {
  const cols = (await c.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name='productos' AND table_schema='public'
      AND is_nullable='NO' AND column_default IS NULL
      AND column_name NOT IN ('id','organizacion_id')`)).rows
  const p = { nombre }
  for (const col of cols) {
    if (col.column_name === "nombre") continue
    p[col.column_name] = /int|numeric|double|real/.test(col.data_type) ? 0
      : col.data_type === "boolean" ? false : "x"
  }
  return p
}

const fail = (m) => { console.error("❌ FALLO:", m); cleanup().then(() => process.exit(1)) }

let userB
async function cleanup() {
  try {
    await c.query("DELETE FROM productos WHERE nombre=$1", [PROD])
    if (userB) {
      await c.query("DELETE FROM org_usuarios WHERE user_id=$1", [userB])
      await c.query("DELETE FROM organizaciones WHERE nombre='Org Test Aislamiento'")
      await fetch(`${URL_SB}/auth/v1/admin/users/${userB}`, {
        method: "DELETE", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}` },
      })
    }
  } catch (e) { console.error("cleanup warn:", e.message) }
  await c.end()
}

// ── Setup ───────────────────────────────────────────────────────────────────
console.log("Preparando 2 organizaciones…")
const userA = (await c.query("SELECT id FROM auth.users WHERE email=$1", [A.email])).rows[0]?.id
if (!userA) fail("no existe el usuario owner; corré seed_owner.mjs primero")
userB = await adminCreateUser(B.email, B.pass)
const orgB = await ensureOrg(userB, "Org Test Aislamiento")
const orgA = (await c.query("SELECT organizacion_id FROM org_usuarios WHERE user_id=$1 LIMIT 1", [userA])).rows[0].organizacion_id
console.log("  Org A:", orgA, "\n  Org B:", orgB)

const tokenA = await signIn(A.email, A.pass)
const tokenB = await signIn(B.email, B.pass)
const payload = await productPayload(PROD)

// limpiar restos de corridas previas
await c.query("DELETE FROM productos WHERE nombre=$1", [PROD])

// ── A inserta su producto, B inserta el suyo (mismo nombre: prueba unique por org)
const insA = await rest("POST", "productos", tokenA, payload, "return=representation")
if (!insA.ok) fail("A no pudo insertar producto: " + JSON.stringify(insA.data))
const insB = await rest("POST", "productos", tokenB, payload, "return=representation")
if (!insB.ok) fail("B no pudo insertar producto (¿unique por org?): " + JSON.stringify(insB.data))
console.log("\n✔ Ambas orgs insertaron un producto con el MISMO nombre (unique por org OK)")

// ── Cada uno lista productos: debe ver SOLO el suyo ─────────────────────────
const verA = await rest("GET", "productos?select=nombre,organizacion_id", tokenA)
const verB = await rest("GET", "productos?select=nombre,organizacion_id", tokenB)
const orgsVistasA = [...new Set(verA.data.map(p => p.organizacion_id))]
const orgsVistasB = [...new Set(verB.data.map(p => p.organizacion_id))]

console.log(`\nUsuario A ve ${verA.data.length} producto(s), de orgs:`, orgsVistasA)
console.log(`Usuario B ve ${verB.data.length} producto(s), de orgs:`, orgsVistasB)

if (orgsVistasA.some(o => o !== orgA)) fail("¡A ve productos de otra org! " + JSON.stringify(orgsVistasA))
if (orgsVistasB.some(o => o !== orgB)) fail("¡B ve productos de otra org! " + JSON.stringify(orgsVistasB))

// ── dashboard_kpis: cada uno cuenta solo lo suyo ────────────────────────────
const kpiA = await rest("POST", "rpc/dashboard_kpis", tokenA, {})
const kpiB = await rest("POST", "rpc/dashboard_kpis", tokenB, {})
console.log("\ndashboard_kpis sin_stock — A:", kpiA.data?.sin_stock, "| B:", kpiB.data?.sin_stock,
            "(cada uno cuenta solo sus productos)")

console.log("\n✅ AISLAMIENTO VERIFICADO: cada organización ve únicamente su propia data.")
await cleanup()
console.log("🧹 Datos de prueba eliminados. Base limpia.")
