"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const f = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—"

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

export default function CobrosPage() {
  const [items, setItems] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [tab, setTab] = useState<"pendientes" | "cobrados">("pendientes")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from("consultas")
      .select("id, fecha, para_cobrar, cobrado, paciente_id, pacientes(id, nombre, especie, cliente_id, clientes(nombre, apellido, telefono))")
      .not("para_cobrar", "is", null)
      .order("fecha", { ascending: false })
    setItems(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function marcarCobrado(c: any, cobrado: boolean) {
    const { error } = await supabase.from("consultas").update({ cobrado }).eq("id", c.id)
    if (error) { mostrar("Error", "error"); return }
    setItems(prev => prev.map(x => x.id === c.id ? { ...x, cobrado } : x))
    mostrar(cobrado ? "Marcado como cobrado" : "Cobro anulado · volvió a pendientes", "ok")
  }

  const tutorDe = (c: any) => c.pacientes?.clientes ? `${c.pacientes.clientes.nombre || ""} ${c.pacientes.clientes.apellido || ""}`.trim() : ""
  const pendientes = items.filter(c => !c.cobrado)
  const cobrados = items.filter(c => c.cobrado)
  const filtrados = (tab === "pendientes" ? pendientes : cobrados).filter(c => {
    const q = busqueda.toLowerCase()
    return (c.pacientes?.nombre || "").toLowerCase().includes(q) || tutorDe(c).toLowerCase().includes(q) || (c.para_cobrar || "").toLowerCase().includes(q)
  })

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 10 }}>
          {([["pendientes", `Pendientes (${pendientes.length})`], ["cobrados", `Cobrados (${cobrados.length})`]] as const).map(([k, lab]) => (
            <button key={k} onClick={() => setTab(k)} style={{ border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === k ? "white" : "transparent", color: tab === k ? "#1d1b12" : "#64748b", boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{lab}</button>
          ))}
        </div>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por paciente, tutor o ítem…" style={{ width: "100%", maxWidth: 320, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }} />
      </div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === "pendientes" ? "✅" : "🧾"}</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>{tab === "pendientes" ? "No hay cobros pendientes" : "Todavía no hay cobrados"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.map(c => {
            const tutor = tutorDe(c)
            return (
              <div key={c.id} style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: `4px solid ${c.cobrado ? "#94a3b8" : "#16a34a"}`, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1d1b12" }}>
                    {c.pacientes ? <Link href={`/pacientes/${c.pacientes.id}`} style={{ color: "#1d1b12", textDecoration: "none" }}>🐾 {c.pacientes.nombre}</Link> : "Paciente"}
                    {tutor && <span style={{ fontWeight: 500, color: "#64748b", fontSize: 13 }}> · {tutor}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#1d1b12", marginTop: 3 }}>
                    <b style={{ color: c.cobrado ? "#16a34a" : "#15803d", fontWeight: 800 }}>{c.cobrado ? "✓ Cobrado:" : "💲 A cobrar:"}</b>{" "}
                    <span style={{ textDecoration: c.cobrado ? "line-through" : "none" }}>{c.para_cobrar}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    🗓 {f(c.fecha)}{c.pacientes?.clientes?.telefono ? ` · 📞 ${c.pacientes.clientes.telefono}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {!c.cobrado && c.pacientes?.cliente_id && (
                    <Link href={`/ventas?cliente=${c.pacientes.cliente_id}&cobrar=${encodeURIComponent(c.para_cobrar)}`}
                      style={{ background: "#1d1b12", color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>Cobrar →</Link>
                  )}
                  {!c.cobrado
                    ? <button onClick={() => marcarCobrado(c, true)} style={{ background: "#16a34a", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>✓ Cobrado</button>
                    : <button onClick={() => marcarCobrado(c, false)} title="Lo marqué por error" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>↩ Anular</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
