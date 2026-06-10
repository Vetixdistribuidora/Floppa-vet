// run_sql.mjs — Ejecuta un archivo .sql contra la base NUEVA (en una transacción).
// Uso:  node scripts/run_sql.mjs <archivo.sql>
// Nunca toca producción: usa siempre NEW de .dburls.local.
import { readFileSync } from "node:fs"
import pg from "pg"

const file = process.argv[2]
if (!file) { console.error("uso: node scripts/run_sql.mjs <archivo.sql>"); process.exit(1) }

const dbs = Object.fromEntries(
  readFileSync(new URL("../.dburls.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sql = readFileSync(new URL("../" + file, import.meta.url), "utf8")

const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
try {
  await c.query("BEGIN")
  await c.query(sql)
  await c.query("COMMIT")
  console.log("✅ Aplicado:", file)
} catch (e) {
  await c.query("ROLLBACK").catch(() => {})
  console.error("❌ Error (rollback, base intacta):", e.message)
  process.exitCode = 1
} finally {
  await c.end()
}
