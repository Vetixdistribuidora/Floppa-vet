import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()

// Tablas de la app (public) con su estado de RLS
const t = await c.query(`SELECT c.relname, c.relrowsecurity AS rls
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`)
const pol = await c.query(`SELECT tablename, COUNT(*) n FROM pg_policies WHERE schemaname='public' GROUP BY tablename`)
const polMap = Object.fromEntries(pol.rows.map(r => [r.tablename, Number(r.n)]))
const trg = await c.query(`SELECT event_object_table tbl FROM information_schema.triggers WHERE trigger_name='tg_set_org_id'`)
const trgSet = new Set(trg.rows.map(r => r.tbl))
const orgCols = await c.query(`SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='organizacion_id'`)
const hasOrg = new Set(orgCols.rows.map(r => r.table_name))

console.log("TABLA".padEnd(26), "ORG_COL", "RLS", "POLICIES", "TRIGGER")
for (const r of t.rows) {
  const name = r.relname
  if (name.startsWith("_") || ["spatial_ref_sys"].includes(name)) continue
  const org = hasOrg.has(name)
  const flags = []
  if (org && !r.rls) flags.push("⚠RLS_OFF")
  if (org && !polMap[name]) flags.push("⚠NO_POLICY")
  if (org && !trgSet.has(name)) flags.push("⚠NO_TRIGGER")
  console.log(name.padEnd(26), String(org).padEnd(7), String(r.rls).padEnd(3), String(polMap[name] || 0).padEnd(8), (trgSet.has(name) ? "yes" : "-").padEnd(7), flags.join(" "))
}

console.log("\nBUCKETS:")
const b = await c.query(`SELECT id, public FROM storage.buckets ORDER BY id`)
b.rows.forEach(r => console.log("  ", r.id, "public=" + r.public))

console.log("\nCOLUMNAS CLAVE:")
const checks = [["consultas", "cobrar_items"], ["consultas", "cobrado"], ["consultas", "para_cobrar"], ["productos", "es_servicio"], ["internaciones", "jaula"], ["organizaciones", "logo_url"], ["organizaciones", "mostrar_rubro"], ["organizaciones", "rubro"], ["pacientes", "fallecido"], ["pacientes", "imagen_url"], ["recordatorios", "estado"]]
for (const [tb, col] of checks) {
  const r = await c.query(`SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [tb, col])
  console.log("  ", (tb + "." + col).padEnd(34), r.rowCount ? "OK" : "❌ FALTA")
}
await c.end()
