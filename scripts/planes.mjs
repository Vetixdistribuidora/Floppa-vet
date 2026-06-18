import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='planes' ORDER BY ordinal_position`)
console.log("planes cols:", cols.rows.map(r => r.column_name).join(", "))
const r = await c.query("SELECT * FROM planes ORDER BY id")
r.rows.forEach(p => console.log(JSON.stringify(p)))
await c.end()
