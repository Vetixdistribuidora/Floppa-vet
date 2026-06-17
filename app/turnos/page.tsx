"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"
import { abrirWhatsApp } from "@/lib/whatsapp"
import { empresaNombre } from "@/lib/empresa"

const OLIVA = "#6f7d49"
const TIPOS = ["Consulta", "Control", "Vacunación", "Cirugía", "Peluquería", "Estudios", "Otro"]
const ESTADOS: Record<string, { label: string; bg: string; color: string; bd: string }> = {
  reservado:  { label: "Reservado",  bg: "#eff6ff", color: "#1d4ed8", bd: "#bfdbfe" },
  confirmado: { label: "Confirmado", bg: "#eef0e0", color: "#4b5a2c", bd: "#cdd6a8" },
  atendido:   { label: "Atendido",   bg: "#dcfce7", color: "#15803d", bd: "#86efac" },
  ausente:    { label: "Ausente",    bg: "#fef2f2", color: "#dc2626", bd: "#fecaca" },
  cancelado:  { label: "Cancelado",  bg: "#f1f5f9", color: "#64748b", bd: "#e2e8f0" },
}
const hoyISO = () => new Date().toISOString().split("T")[0]

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }

function sumarDias(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]
}
function fechaLarga(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })
}
const formVacio = () => ({ paciente_id: "", hora: "09:00", duracion: "30", tipo: "Consulta", profesional: "", notas: "" })

export default function TurnosPage() {
  const [fecha, setFecha] = useState(hoyISO())
  const [turnos, setTurnos] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const [{ data: tt }, { data: pac }] = await Promise.all([
      supabase.from("turnos").select("*, pacientes(nombre, especie), clientes(nombre, apellido, telefono)").eq("fecha", fecha).order("hora", { ascending: true }),
      supabase.from("pacientes").select("id, nombre, especie, cliente_id, clientes(id, nombre, apellido, telefono)").eq("fallecido", false).order("nombre"),
    ])
    setTurnos(tt || []); setPacientes(pac || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [fecha])

  function abrirNuevo() { setEditId(null); setForm(formVacio()); setModal(true) }
  function abrirEditar(t: any) {
    setEditId(t.id)
    setForm({ paciente_id: t.paciente_id ? String(t.paciente_id) : "", hora: (t.hora || "09:00").slice(0, 5), duracion: String(t.duracion || 30), tipo: t.tipo || "Consulta", profesional: t.profesional || "", notas: t.notas || "" })
    setModal(true)
  }

  async function guardar() {
    if (!form.hora) { mostrar("Elegí la hora", "error"); return }
    setGuardando(true)
    const pac = pacientes.find(p => String(p.id) === form.paciente_id)
    const payload: any = {
      paciente_id: form.paciente_id ? Number(form.paciente_id) : null,
      cliente_id: pac?.cliente_id ?? pac?.clientes?.id ?? null,
      fecha, hora: form.hora, duracion: Number(form.duracion) || 30,
      tipo: form.tipo || null, profesional: form.profesional.trim() || null, notas: form.notas.trim() || null,
    }
    try {
      if (editId) {
        const { error } = await supabase.from("turnos").update(payload).eq("id", editId); if (error) throw error
        mostrar("Turno actualizado", "ok")
      } else {
        const { error } = await supabase.from("turnos").insert([payload]); if (error) throw error
        mostrar("Turno agendado", "ok")
      }
      setModal(false); cargar()
    } catch (e: any) { mostrar("Error: " + (e?.message || "desconocido"), "error") } finally { setGuardando(false) }
  }

  async function cambiarEstado(t: any, estado: string) {
    const { error } = await supabase.from("turnos").update({ estado }).eq("id", t.id)
    if (error) { mostrar("Error", "error"); return }
    setTurnos(prev => prev.map(x => x.id === t.id ? { ...x, estado } : x))
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("turnos").delete().eq("id", confirmEliminar.id)
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Turno eliminado", "ok"); setTurnos(prev => prev.filter(x => x.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  function recordarWhatsApp(t: any) {
    const cli = t.clientes
    const tutor = cli ? `${cli.nombre || ""}`.trim() : ""
    const pac = t.pacientes?.nombre || "tu mascota"
    const fechaTxt = new Date(fecha + "T00:00:00").toLocaleDateString("es-AR")
    const emp = empresaNombre()
    const msg = `Hola${tutor ? " " + tutor : ""}! 📅 Te recordamos el turno de ${pac} en ${emp || "la veterinaria"} el ${fechaTxt} a las ${(t.hora || "").slice(0, 5)}${t.tipo ? " (" + t.tipo + ")" : ""}. ¡Te esperamos!`
    if (!abrirWhatsApp(cli?.telefono, msg)) mostrar("El tutor no tiene teléfono cargado", "error")
  }

  const atendidos = turnos.filter(t => t.estado === "atendido").length
  const pendientes = turnos.filter(t => t.estado === "reservado" || t.estado === "confirmado").length

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      {/* Navegación de día */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setFecha(sumarDias(fecha, -1))} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: "#475569" }}>←</button>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 12px" }} />
          <button onClick={() => setFecha(sumarDias(fecha, 1))} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: "#475569" }}>→</button>
          {fecha !== hoyISO() && <button onClick={() => setFecha(hoyISO())} style={{ background: "#eef0e0", border: "1px solid #cdd6a8", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#4b5a2c" }}>Hoy</button>}
        </div>
        <button onClick={abrirNuevo} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Nuevo turno</button>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#1d1b12", textTransform: "capitalize", marginBottom: 4 }}>{fechaLarga(fecha)}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{turnos.length} turno{turnos.length !== 1 ? "s" : ""} · {pendientes} pendiente{pendientes !== 1 ? "s" : ""} · {atendidos} atendido{atendidos !== 1 ? "s" : ""}</div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : turnos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>No hay turnos para este día</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {turnos.map(t => {
            const est = ESTADOS[t.estado] || ESTADOS.reservado
            const tutor = t.clientes ? `${t.clientes.nombre || ""} ${t.clientes.apellido || ""}`.trim() : ""
            return (
              <div key={t.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", background: "#f4f2e6", color: "#4b5a2c", borderRadius: 9, padding: "8px 12px", minWidth: 70, fontWeight: 800, fontSize: 16 }}>
                  {(t.hora || "").slice(0, 5)}
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{t.duracion || 30}'</div>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12" }}>
                    {t.tipo || "Turno"}{t.pacientes && <span style={{ fontWeight: 500, color: "#64748b" }}> · 🐾 {t.pacientes.nombre}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                    {tutor && <span>{tutor}</span>}{t.profesional && <span> · 👤 {t.profesional}</span>}{t.notas && <span> · {t.notas}</span>}
                  </div>
                </div>
                <select value={t.estado} onChange={e => cambiarEstado(t, e.target.value)}
                  style={{ background: est.bg, color: est.color, border: `1px solid ${est.bd}`, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k} style={{ background: "white", color: "#1d1b12" }}>{v.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 6 }}>
                  {t.clientes?.telefono && (
                    <button onClick={() => recordarWhatsApp(t)} title="Recordar por WhatsApp" style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: "#15803d", fontWeight: 700 }}>💬</button>
                  )}
                  <button onClick={() => abrirEditar(t)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#475569" }}>✎</button>
                  <button onClick={() => setConfirmEliminar(t)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{editId ? "Editar turno" : "Nuevo turno"} · {new Date(fecha + "T00:00:00").toLocaleDateString("es-AR")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Hora *</label>
                <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Duración (min)</label>
                <input type="number" value={form.duracion} onChange={e => setForm({ ...form, duracion: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Profesional</label>
                <input value={form.profesional} onChange={e => setForm({ ...form, profesional: e.target.value })} placeholder="Vet. a cargo" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Paciente</label>
                <ComboBox
                  options={pacientes.map(p => ({ value: String(p.id), label: `${p.nombre}${p.clientes ? ` — ${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trimEnd() : ""}` }))}
                  value={form.paciente_id}
                  onChange={v => setForm({ ...form, paciente_id: v })}
                  placeholder="Buscar paciente…"
                  emptyLabel="— Sin paciente —"
                />
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
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 20 }}>¿Eliminar este turno?</p>
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
