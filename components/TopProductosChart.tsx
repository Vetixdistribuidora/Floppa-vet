"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"

const OLIVA = "#6f7d49"
const card: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }
const h3: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 800, color: "#1d1b12" }

type Periodo = "mes" | "3meses" | "anio"
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "mes", label: "Este mes" },
  { key: "3meses", label: "Últimos 3 meses" },
  { key: "anio", label: "Este año" },
]

function rangoDe(periodo: Periodo): { desde: string; hasta: string } {
  const h = new Date()
  const hasta = h.toLocaleDateString("sv-SE")
  if (periodo === "mes") return { desde: new Date(h.getFullYear(), h.getMonth(), 1).toLocaleDateString("sv-SE"), hasta }
  if (periodo === "3meses") { const ini = new Date(h); ini.setMonth(ini.getMonth() - 3); return { desde: ini.toLocaleDateString("sv-SE"), hasta } }
  return { desde: h.getFullYear() + "-01-01", hasta }
}

// Ranking de productos/servicios más vendidos en un período, con búsqueda por
// nombre (ej. "vacuna", "análisis de sangre") para ver un rubro específico.
export default function TopProductosChart() {
  const [periodo, setPeriodo] = useState<Periodo>("mes")
  const [metrica, setMetrica] = useState<"unidades" | "facturacion">("unidades")
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState<any[]>([])

  useEffect(() => { cargar() }, [periodo])

  async function cargar() {
    setCargando(true)
    const { desde, hasta } = rangoDe(periodo)
    const desdeUTC = new Date(desde + "T00:00:00").toISOString()
    const hastaUTC = new Date(hasta + "T23:59:59").toISOString()

    const { data: ventas } = await supabase.from("ventas").select("id").gte("fecha", desdeUTC).lte("fecha", hastaUTC).neq("estado", "anulada")
    const ventaIds = (ventas || []).map(v => v.id)
    if (ventaIds.length === 0) { setDatos([]); setCargando(false); return }

    const CHUNK = 200
    let detalles: any[] = []
    for (let i = 0; i < ventaIds.length; i += CHUNK) {
      const { data: det } = await supabase.from("detalle_ventas").select("producto_id, cantidad, precio, bonificacion").in("venta_id", ventaIds.slice(i, i + CHUNK))
      if (det) detalles = [...detalles, ...det]
    }

    const idsUnicos = [...new Set(detalles.map(d => d.producto_id))]
    const nombres: Record<number, string> = {}
    for (let i = 0; i < idsUnicos.length; i += CHUNK) {
      const { data: prods } = await supabase.from("productos").select("id, nombre").in("id", idsUnicos.slice(i, i + CHUNK))
      prods?.forEach((p: any) => { nombres[p.id] = p.nombre })
    }

    const mapa: Record<number, { nombre: string; unidades: number; facturacion: number }> = {}
    for (const d of detalles) {
      if (!mapa[d.producto_id]) mapa[d.producto_id] = { nombre: nombres[d.producto_id] || `Producto #${d.producto_id}`, unidades: 0, facturacion: 0 }
      const bonif = d.bonificacion || 0
      mapa[d.producto_id].unidades += d.cantidad
      mapa[d.producto_id].facturacion += d.precio * Math.max(0, d.cantidad - bonif)
    }
    setDatos(Object.values(mapa))
    setCargando(false)
  }

  const filtrados = datos
    .filter(d => !busqueda.trim() || d.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => b[metrica] - a[metrica])
    .slice(0, 8)
    .map(d => ({ ...d, nombreCorto: d.nombre.length > 22 ? d.nombre.slice(0, 20) + "…" : d.nombre }))

  return (
    <div style={{ ...card, gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h3 style={h3}>📊 Productos y servicios más vendidos</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)} style={{ border: `1px solid ${periodo === p.key ? "var(--accent)" : "#e2e8f0"}`, background: periodo === p.key ? "#eef0e0" : "white", color: periodo === p.key ? "var(--accent-dark)" : "#64748b", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar (ej: vacuna, análisis de sangre)…"
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1d1b12", outline: "none" }} />
        <div style={{ display: "flex", gap: 6 }}>
          {(["unidades", "facturacion"] as const).map(m => (
            <button key={m} onClick={() => setMetrica(m)} style={{ border: `1px solid ${metrica === m ? "var(--accent)" : "#e2e8f0"}`, background: metrica === m ? "#eef0e0" : "white", color: metrica === m ? "var(--accent-dark)" : "#64748b", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {m === "unidades" ? "Por unidades" : "Por facturación"}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 30 }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 30 }}>Sin ventas para este filtro en el período elegido.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, filtrados.length * 40)}>
          <BarChart data={filtrados} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0e0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={v => metrica === "facturacion" ? "$" + Math.round(v / 1000) + "k" : String(v)} />
            <YAxis type="category" dataKey="nombreCorto" width={150} tick={{ fontSize: 12, fill: "#1d1b12" }} />
            <Tooltip
              formatter={(v: any) => metrica === "facturacion" ? ["$" + Math.round(v).toLocaleString("es-AR"), "Facturación"] : [v, "Unidades"]}
              labelFormatter={(_, p) => p?.[0]?.payload?.nombre || ""}
            />
            <Bar dataKey={metrica} radius={[0, 6, 6, 0]}>
              {filtrados.map((_, i) => <Cell key={i} fill={OLIVA} fillOpacity={1 - i * 0.07} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
