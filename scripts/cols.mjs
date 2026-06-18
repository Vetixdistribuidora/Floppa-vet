import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
for (const t of ["clientes", "sala_espera"]) {
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t])
  console.log("\n== " + t + " ==")
  r.rows.forEach(x => console.log(" ", x.column_name, "·", x.data_type))
}
await c.end()
