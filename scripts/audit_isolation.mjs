import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()

console.log("=== get_my_org_id() ===")
const f1 = await c.query(`SELECT pg_get_functiondef(p.oid) d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='get_my_org_id'`)
console.log(f1.rows[0]?.d || "❌ NO EXISTE")

console.log("\n=== _set_org_id() ===")
const f2 = await c.query(`SELECT pg_get_functiondef(p.oid) d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='_set_org_id'`)
console.log(f2.rows[0]?.d || "❌ NO EXISTE")

console.log("\n=== POLITICAS por tabla (public) ===")
const pol = await c.query(`SELECT tablename, policyname, cmd, roles::text, qual, with_check
  FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname`)
let tablaActual = ""
for (const p of pol.rows) {
  if (p.tablename !== tablaActual) { tablaActual = p.tablename; console.log("\n• " + tablaActual) }
  const usa = (p.qual || "") + " " + (p.with_check || "")
  const ok = usa.includes("get_my_org_id") ? "OK" : (["organizaciones","planes","tienda_perfiles","suscripciones","org_usuarios","invitaciones"].includes(p.tablename) ? "·especial" : "⚠ SIN org")
  console.log(`   [${ok}] ${p.policyname} (${p.cmd}) qual=${p.qual || "-"} | check=${p.with_check || "-"}`)
}

console.log("\n=== STORAGE policies (con expresiones) ===")
const sp = await c.query(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname`)
sp.rows.forEach(r => console.log(`   ${r.policyname} (${r.cmd}) using=${r.qual || "-"} check=${r.with_check || "-"}`))

await c.end()
