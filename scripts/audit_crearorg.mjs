import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
for (const fn of ["crear_organizacion"]) {
  const r = await c.query(`SELECT pg_get_functiondef(p.oid) d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname=$1`, [fn])
  console.log("=== " + fn + " ===\n" + (r.rows[0]?.d || "❌ NO EXISTE"))
}
// ¿Hay GRANTs de INSERT/UPDATE/DELETE a authenticated sobre org_usuarios?
const g = await c.query(`SELECT privilege_type FROM information_schema.role_table_grants WHERE table_name='org_usuarios' AND grantee='authenticated' ORDER BY privilege_type`)
console.log("\norg_usuarios grants a authenticated:", g.rows.map(r => r.privilege_type).join(", ") || "(ninguno)")
await c.end()
