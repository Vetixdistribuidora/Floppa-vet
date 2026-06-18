import { readFileSync } from "node:fs"
import pg from "pg"
const dbs = Object.fromEntries(readFileSync(new URL("../.dburls.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new pg.Client({ connectionString: dbs.NEW, ssl: { rejectUnauthorized: false } })
await c.connect()
const fns = ["dashboard_kpis", "get_next_nro_factura", "get_next_nro_recibo", "registrar_auditoria", "productos_sin_ventas", "productos_sin_rotacion", "crear_organizacion", "get_my_org_id", "_set_org_id", "registrar_compra"]
console.log("FUNCIONES:")
for (const f of fns) {
  const r = await c.query(`SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname=$1`, [f])
  console.log("  ", f.padEnd(26), r.rowCount ? "OK" : "❌ FALTA")
}
const views = ["lotes_con_stock", "saldo_clientes", "saldo_proveedores"]
console.log("VISTAS:")
for (const v of views) {
  const r = await c.query(`SELECT 1 FROM information_schema.views WHERE table_name=$1`, [v])
  const r2 = r.rowCount ? r : await c.query(`SELECT 1 FROM information_schema.tables WHERE table_name=$1`, [v])
  console.log("  ", v.padEnd(26), r2.rowCount ? "OK" : "❌ FALTA")
}
await c.end()
