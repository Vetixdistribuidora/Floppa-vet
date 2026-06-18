import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
const p = await c.query(`SELECT policyname, cmd, roles::text FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname`)
console.log("storage.objects policies:")
p.rows.forEach(r => console.log("  ", r.policyname, "|", r.cmd, "|", r.roles))
await c.end()
