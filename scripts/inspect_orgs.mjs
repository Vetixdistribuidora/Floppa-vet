// Inspecciona organizaciones: rubro, tipo de columna modulos y su contenido.
import { readFileSync } from "node:fs"
import pg from "pg"

const dbs = Object.fromEntries(
  readFileSync(new URL("../.dburls.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
try {
  const t = await c.query("SELECT data_type FROM information_schema.columns WHERE table_name='organizaciones' AND column_name='modulos'")
  console.log("tipo columna modulos:", t.rows[0]?.data_type)
  const r = await c.query("SELECT id, nombre, rubro, mostrar_rubro, modulos FROM organizaciones ORDER BY nombre")
  for (const o of r.rows) {
    console.log("—", o.nombre, "| rubro:", o.rubro, "| mostrar_rubro:", o.mostrar_rubro)
    console.log("   modulos:", JSON.stringify(o.modulos))
  }
} finally { await c.end() }
