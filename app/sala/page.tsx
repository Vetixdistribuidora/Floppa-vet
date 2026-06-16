"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"

const TEAL = "#0d9488"

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

function esperaTexto(desde: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 60000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "white" }

export default function SalaEsperaPage() {
  const [items, setItems] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ paciente_id: "", nombre_libre: "", motivo: "", prioridad: "normal" })
  const [guardando, setGuardando] = useState(false)
  const [, setTick] = useState(0)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0)
    const [{ data: sala }, { data: pac }] = await Promise.all([
      supabase.from("sala_espera")
        .select("*, pacientes(id, nombre, especie, clientes(nombre, apellido, telefono))")
        .or(`estado.neq.atendido,check_in_at.gte.${inicioHoy.toISOString()}`)
        .order("check_in_at", { ascending: true }),
      supabase.from("pacientes").select("id, nombre, especie").order("nombre"),
    ])
    setItems(sala || [])
    setPacientes(pac || [])
    setCargando(false)
  }
  useEffect(() => {
    cargar()
    const i = setInterval(() => setTick(t => t + 1), 30000) // refrescar tiempos de espera
    return () => clearInterval(i)
  }, [])

  async function agregar() {
    if (!form.paciente_id && !form.nombre_libre.trim()) { mostrar("Elegí un paciente o escribí un nombre", "error"); return }
    setGuardando(true)
    const { error } = await supabase.from("sala_espera").insert([{
      paciente_id: form.paciente_id ? Number(form.paciente_id) : null,
      nombre_libre: form.paciente_id ? null : form.nombre_libre.trim(),
      motivo: form.motivo.trim() || null,
      prioridad: form.prioridad,
    }])
    setGuardando(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    setModal(false); setForm({ paciente_id: "", nombre_libre: "", motivo: "", prioridad: "normal" })
    cargar()
  }

  async function cambiarEstado(it: any, estado: string) {
    const patch: any = { estado }
    if (estado === "atendido") patch.atendido_at = new Date().toISOString()
    const { error } = await supabase.from("sala_espera").update(patch).eq("id", it.id)
    if (error) { mostrar("Error", "error"); return }
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, ...patch } : x))
  }
  async function quitar(it: any) {
    await supabase.from("sala_espera").delete().eq("id", it.id)
    setItems(prev => prev.filter(x => x.id !== it.id))
  }

  const nombreDe = (it: any) => it.pacientes?.nombre || it.nombre_libre || "Paciente"
  const tutorDe = (it: any) => it.pacientes?.clientes ? `${it.pacientes.clientes.nombre || ""} ${it.pacientes.clientes.apellido || ""}`.trim() : ""

  const ordenar = (arr: any[]) => [...arr].sort((a, b) =>
    (a.prioridad === "urgente" ? 0 : 1) - (b.prioridad === "urgente" ? 0 : 1) ||
    a.check_in_at.localeCompare(b.check_in_at))

  const esperando = ordenar(items.filter(i => i.estado === "esperando"))
  const atendiendo = items.filter(i => i.estado === "atendiendo")
  const atendidos = items.filter(i => i.estado === "atendido")

  function Tarjeta({ it, idx }: { it: any; idx?: number }) {
    const urgente = it.prioridad === "urgente"
    const tutor = tutorDe(it)
    return (
      <div style={{ background: "white", border: `1px solid ${urgente ? "#fecaca" : "#e2e8f0"}`, borderLeft: `4px solid ${urgente ? "#dc2626" : TEAL}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {idx != null && <div style={{ fontSize: 22, fontWeight: 800, color: urgente ? "#dc2626" : "#94a3b8", minWidth: 28, textAlign: "center" }}>{idx + 1}</div>}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: "#0f172a" }}>
            {it.pacientes ? <Link href={`/pacientes/${it.pacientes.id}`} style={{ color: "#0f172a", textDecoration: "none" }}>{nombreDe(it)}</Link> : nombreDe(it)}
            {it.pacientes?.especie && <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: 13 }}> · {it.pacientes.especie}</span>}
            {urgente && <span style={{ marginLeft: 8, background: "#fef2f2", color: "#dc2626", fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>URGENTE</span>}
          </div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            {tutor && `👤 ${tutor}`}{it.pacientes?.clientes?.telefono ? ` · 📞 ${it.pacientes.clientes.telefono}` : ""}
          </div>
          {it.motivo && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 2 }}>📝 {it.motivo}</div>}
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
          {it.estado !== "atendido" ? <>⏱ {esperaTexto(it.check_in_at)}</> : "✓ atendido"}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {it.pacientes && <Link href={`/consultas?paciente=${it.pacientes.id}`} title="Abrir consulta" style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", borderRadius: 7, padding: "5px 10px", fontSize: 12, color: "#6f7d49", fontWeight: 700, textDecoration: "none" }}>📋</Link>}
          {it.estado === "esperando" && <button onClick={() => cambiarEstado(it, "atendiendo")} style={{ background: TEAL, color: "white", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>▶ Atender</button>}
          {it.estado === "atendiendo" && <button onClick={() => cambiarEstado(it, "atendido")} style={{ background: "#16a34a", color: "white", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>✓ Finalizar</button>}
          {it.estado === "atendido" && <button onClick={() => cambiarEstado(it, "esperando")} title="Volver a la espera" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#475569", cursor: "pointer" }}>↩</button>}
          <button onClick={() => quitar(it)} title="Quitar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#dc2626", cursor: "pointer" }}>✕</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 18px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>En espera</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: esperando.length ? TEAL : "#0f172a" }}>{esperando.length}</div>
          </div>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 18px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>En atención</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{atendiendo.length}</div>
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{ background: TEAL, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Agregar a la sala</button>
      </div>

      {cargando ? <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>🟢 En espera (orden de atención)</h3>
            {esperando.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "white", border: "1px dashed #e2e8f0", borderRadius: 12 }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>🪑</div>
                <p style={{ fontWeight: 600, color: "#475569", margin: 0 }}>Sala vacía</p>
              </div>
            ) : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{esperando.map((it, i) => <Tarjeta key={it.id} it={it} idx={i} />)}</div>}
          </div>

          {atendiendo.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>🔵 En atención</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{atendiendo.map(it => <Tarjeta key={it.id} it={it} />)}</div>
            </div>
          )}

          {atendidos.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#94a3b8", margin: "0 0 10px" }}>✓ Atendidos hoy ({atendidos.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.7 }}>{atendidos.map(it => <Tarjeta key={it.id} it={it} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Modal agregar */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#0f172a" }}>Agregar a la sala</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Paciente</label>
                <ComboBox
                  options={pacientes.map(p => ({ value: String(p.id), label: `${p.nombre}${p.especie ? ` (${p.especie})` : ""}` }))}
                  value={form.paciente_id}
                  onChange={v => setForm({ ...form, paciente_id: v })}
                  placeholder="Buscar paciente…"
                  emptyLabel="— Sin registrar (escribir nombre) —"
                />
              </div>
              {!form.paciente_id && (
                <div>
                  <label style={labelStyle}>Nombre (si no está registrado)</label>
                  <input value={form.nombre_libre} onChange={e => setForm({ ...form, nombre_libre: e.target.value })} placeholder="Ej: Rocky (consulta de Juan)" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Motivo</label>
                <input value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} placeholder="Ej: Control, vómitos, vacuna…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Prioridad</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["normal", "Normal", "#0d9488"], ["urgente", "Urgente", "#dc2626"]].map(([v, lab, col]) => (
                    <button key={v} type="button" onClick={() => setForm({ ...form, prioridad: v })}
                      style={{ flex: 1, padding: "10px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13.5, border: form.prioridad === v ? `2px solid ${col}` : "1px solid #e2e8f0", background: form.prioridad === v ? `${col}15` : "white", color: form.prioridad === v ? col : "#64748b" }}>
                      {lab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModal(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={agregar} disabled={guardando} style={{ background: TEAL, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardando ? "wait" : "pointer" }}>{guardando ? "Agregando…" : "Agregar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
