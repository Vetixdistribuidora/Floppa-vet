"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"
import { abrirWhatsApp } from "@/lib/whatsapp"
import { empresaNombre } from "@/lib/empresa"

const OLIVA = "var(--accent)"
const TIPOS = ["Vacuna Antirrábica", "Vacuna Quíntuple", "Vacuna Triple", "Vacuna Leucemia Felina", "Desparasitación Interna", "Desparasitación Externa", "Medicación", "Otro"]
const hoyISO = () => new Date().toISOString().split("T")[0]

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

function diasHasta(fecha: string): number {
  const f = new Date(fecha + "T00:00:00"); const h = new Date(); h.setHours(0, 0, 0, 0)
  return Math.round((f.getTime() - h.getTime()) / 86400000)
}
function fechaCorta(f: string) {
  return new Date(f + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }
const formVacio = () => ({ paciente_id: "", fecha_aplicacion: hoyISO(), fecha: "", tipo: "Vacuna Antirrábica", descripcion: "", notas: "" })

export default function RecordatoriosPage() {
  const [items, setItems] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [filtro, setFiltro] = useState<"pendientes" | "todos">("pendientes")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [enviando, setEnviando] = useState<number | null>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const [{ data: rec }, { data: pac }] = await Promise.all([
      supabase.from("recordatorios").select("*, pacientes(nombre, especie, fallecido, clientes(nombre, apellido, email, telefono))").order("fecha", { ascending: true }),
      supabase.from("pacientes").select("id, nombre, especie").eq("fallecido", false).order("nombre"),
    ])
    // No mostrar recordatorios de pacientes fallecidos
    setItems((rec || []).filter((r: any) => !r.pacientes?.fallecido))
    setPacientes(pac || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  function abrirNuevo() { setEditId(null); setForm(formVacio()); setModal(true) }
  function abrirEditar(r: any) {
    setEditId(r.id)
    setForm({ paciente_id: r.paciente_id ? String(r.paciente_id) : "", fecha_aplicacion: r.fecha_aplicacion || "", fecha: r.fecha || hoyISO(), tipo: r.tipo || "Otro", descripcion: r.descripcion || "", notas: r.notas || "" })
    setModal(true)
  }

  async function guardar() {
    if (!form.fecha) { mostrar("Elegí la fecha de la próxima dosis / recordatorio", "error"); return }
    setGuardando(true)
    const payload = {
      paciente_id: form.paciente_id ? Number(form.paciente_id) : null,
      fecha: form.fecha, fecha_aplicacion: form.fecha_aplicacion || null, tipo: form.tipo || null,
      descripcion: form.descripcion.trim() || null, notas: form.notas.trim() || null,
    }
    try {
      if (editId) {
        const { error } = await supabase.from("recordatorios").update(payload).eq("id", editId); if (error) throw error
        mostrar("Recordatorio actualizado", "ok")
      } else {
        const { error } = await supabase.from("recordatorios").insert([payload]); if (error) throw error
        mostrar("Recordatorio agregado", "ok")
      }
      setModal(false); cargar()
    } catch (e: any) { mostrar("Error: " + (e?.message || "desconocido"), "error") } finally { setGuardando(false) }
  }

  async function marcarHecho(r: any, hecho: boolean) {
    const { error } = await supabase.from("recordatorios").update({ estado: hecho ? "hecho" : "pendiente" }).eq("id", r.id)
    if (error) { mostrar("Error", "error"); return }
    setItems(prev => prev.map(x => x.id === r.id ? { ...x, estado: hecho ? "hecho" : "pendiente" } : x))
  }

  async function enviarEmailTutor(r: any) {
    setEnviando(r.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/recordatorio-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id }),
      })
      const j = await res.json()
      if (res.ok) {
        mostrar("📧 Email enviado al tutor", "ok")
        setItems(prev => prev.map(x => x.id === r.id ? { ...x, email_enviado_at: new Date().toISOString() } : x))
      } else mostrar(j.error || "No se pudo enviar", "error")
    } catch (e: any) { mostrar("Error: " + (e?.message || "desconocido"), "error") }
    finally { setEnviando(null) }
  }

  function recordarWhatsApp(r: any) {
    const cli = r.pacientes?.clientes
    const tutor = cli ? `${cli.nombre || ""}`.trim() : ""
    const pac = r.pacientes?.nombre || ""
    const fechaTxt = r.fecha ? new Date(r.fecha + "T00:00:00").toLocaleDateString("es-AR") : ""
    const detalle = r.descripcion ? ` (${r.descripcion})` : ""
    const emp = empresaNombre()
    const msg = `Hola${tutor ? " " + tutor : ""}! 🐾 Te recordamos que ${pac || "tu mascota"} tiene ${r.tipo || "un control"}${detalle} para el ${fechaTxt}. ¡Te esperamos!${emp ? "\n" + emp : ""}`
    if (!abrirWhatsApp(cli?.telefono, msg)) mostrar("El tutor no tiene teléfono cargado", "error")
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("recordatorios").delete().eq("id", confirmEliminar.id)
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Eliminado", "ok"); setItems(prev => prev.filter(x => x.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  const filtrados = filtro === "pendientes" ? items.filter(r => r.estado !== "hecho") : items
  const pendientes = items.filter(r => r.estado !== "hecho")
  const vencidos = pendientes.filter(r => diasHasta(r.fecha) < 0).length
  const proximos = pendientes.filter(r => { const d = diasHasta(r.fecha); return d >= 0 && d <= 7 }).length

  function estiloFecha(r: any) {
    if (r.estado === "hecho") return { color: "#94a3b8", bg: "#f8fafc", label: fechaCorta(r.fecha) }
    const d = diasHasta(r.fecha)
    if (d < 0) return { color: "#dc2626", bg: "#fef2f2", label: `${fechaCorta(r.fecha)} · vencido` }
    if (d === 0) return { color: "#d97706", bg: "#fffbeb", label: `${fechaCorta(r.fecha)} · hoy` }
    if (d <= 7) return { color: "#d97706", bg: "#fffbeb", label: `${fechaCorta(r.fecha)} · en ${d}d` }
    return { color: "#475569", bg: "#f8fafc", label: fechaCorta(r.fecha) }
  }

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      {/* Resumen */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Vencidos</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: vencidos ? "#dc2626" : "#1d1b12" }}>{vencidos}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Próximos 7 días</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: proximos ? "#d97706" : "#1d1b12" }}>{proximos}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Pendientes</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1d1b12" }}>{pendientes.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 10 }}>
          {(["pendientes", "todos"] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{ border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: filtro === f ? "white" : "transparent", color: filtro === f ? "#1d1b12" : "#64748b", boxShadow: filtro === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {f === "pendientes" ? "Pendientes" : "Todos"}
            </button>
          ))}
        </div>
        <button onClick={abrirNuevo} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Nuevo registro</button>
      </div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💉</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>{filtro === "pendientes" ? "No hay registros pendientes" : "Todavía no hay registros de sanidad"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.map(r => {
            const ef = estiloFecha(r); const hecho = r.estado === "hecho"
            return (
              <div key={r.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, opacity: hecho ? 0.65 : 1 }}>
                <div style={{ textAlign: "center", background: ef.bg, color: ef.color, borderRadius: 9, padding: "8px 12px", minWidth: 96, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{ef.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12", textDecoration: hecho ? "line-through" : "none" }}>
                    {r.tipo || "Recordatorio"}{r.pacientes && <span style={{ fontWeight: 500, color: "#64748b" }}> · {r.pacientes.nombre}</span>}
                  </div>
                  {r.descripcion && <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{r.descripcion}</div>}
                  {r.fecha_aplicacion && <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>💉 Aplicada el {new Date(r.fecha_aplicacion + "T00:00:00").toLocaleDateString("es-AR")}</div>}
                  {r.fecha && <div style={{ fontSize: 12, color: "#0891b2", fontWeight: 700, marginTop: 2 }}>📅 Próxima: {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-AR")}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {r.pacientes?.clientes?.telefono && (
                    <button onClick={() => recordarWhatsApp(r)} title="Recordar por WhatsApp"
                      style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: "#15803d", fontWeight: 700 }}>
                      💬
                    </button>
                  )}
                  {r.pacientes?.clientes?.email && (
                    <button onClick={() => enviarEmailTutor(r)} disabled={enviando === r.id}
                      title={r.email_enviado_at ? "Reenviar email al tutor" : "Enviar email al tutor"}
                      style={{ background: r.email_enviado_at ? "#f4f2e6" : "#eef0e0", border: "1px solid #e6e8cf", borderRadius: 7, padding: "5px 10px", cursor: enviando === r.id ? "wait" : "pointer", fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
                      {enviando === r.id ? "…" : r.email_enviado_at ? "📧✓" : "📧"}
                    </button>
                  )}
                  <button onClick={() => marcarHecho(r, !hecho)} title={hecho ? "Marcar pendiente" : "Marcar hecho"} style={{ background: hecho ? "#f1f5f9" : "#ecfdf3", border: `1px solid ${hecho ? "#e2e8f0" : "#a7f3d0"}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: hecho ? "#64748b" : "#16a34a", fontWeight: 700 }}>{hecho ? "↩" : "✓"}</button>
                  <button onClick={() => abrirEditar(r)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#475569" }}>✎</button>
                  <button onClick={() => setConfirmEliminar(r)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{editId ? "Editar registro" : "Nuevo registro de sanidad"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha aplicada</label>
                <input type="date" value={form.fecha_aplicacion} onChange={e => setForm({ ...form, fecha_aplicacion: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Paciente</label>
                <ComboBox
                  options={pacientes.map(p => ({ value: String(p.id), label: `${p.nombre}${p.especie ? ` (${p.especie})` : ""}` }))}
                  value={form.paciente_id}
                  onChange={v => setForm({ ...form, paciente_id: v })}
                  placeholder="Buscar paciente…"
                  emptyLabel="— Sin paciente (general) —"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Próxima dosis / fecha del recordatorio *</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 5 }}>En esta fecha aparece como recordatorio y se le avisa al tutor.</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModal(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardando ? "not-allowed" : "pointer" }}>{guardando ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <div onClick={() => setConfirmEliminar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 20 }}>¿Eliminar este registro?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={eliminar} style={{ background: "#dc2626", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 700, color: "white", cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
