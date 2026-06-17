"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const OLIVA = "#6f7d49"
const hoyISO = () => new Date().toISOString().split("T")[0]

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: 30, right: 30,
      background: tipo === "ok" ? "#2f9e44" : "#e03131",
      color: "white", padding: "12px 22px", borderRadius: 10,
      fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15,
    }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

function fechaCorta(f: string | null) {
  if (!f) return "—"
  return new Date(f + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }

const formVacio = () => ({ paciente_id: "", fecha: hoyISO(), motivo: "", diagnostico: "", tratamiento: "", peso: "", temperatura: "", notas: "", para_cobrar: "" })

export default function ConsultasPage() {
  const [consultas, setConsultas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [filtroPaciente, setFiltroPaciente] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [filtroFecha, setFiltroFecha] = useState(hoyISO()) // por defecto, las consultas de hoy
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
    const [{ data: con }, { data: pac }] = await Promise.all([
      supabase.from("consultas").select("*, pacientes(nombre, especie, cliente_id, clientes(nombre, apellido))").order("fecha", { ascending: false }),
      supabase.from("pacientes").select("id, nombre, especie").order("nombre"),
    ])
    setConsultas(con || [])
    setPacientes(pac || [])
    setCargando(false)
  }
  useEffect(() => {
    cargar()
    // Pre-filtrar por paciente si viene en la URL (?paciente=ID) desde la ficha
    const pid = new URLSearchParams(window.location.search).get("paciente")
    if (pid) setFiltroPaciente(pid)
  }, [])

  function abrirNueva() {
    setEditId(null)
    setForm({ ...formVacio(), paciente_id: filtroPaciente || "" })
    setModal(true)
  }
  function abrirEditar(c: any) {
    setEditId(c.id)
    setForm({
      paciente_id: String(c.paciente_id), fecha: c.fecha || hoyISO(),
      motivo: c.motivo || "", diagnostico: c.diagnostico || "", tratamiento: c.tratamiento || "",
      peso: c.peso ?? "", temperatura: c.temperatura ?? "", notas: c.notas || "", para_cobrar: c.para_cobrar || "",
    })
    setModal(true)
  }

  async function guardar() {
    if (!form.paciente_id) { mostrar("Elegí el paciente", "error"); return }
    setGuardando(true)
    const payload = {
      paciente_id: Number(form.paciente_id), fecha: form.fecha || hoyISO(),
      motivo: form.motivo.trim() || null, diagnostico: form.diagnostico.trim() || null,
      tratamiento: form.tratamiento.trim() || null,
      peso: form.peso === "" ? null : Number(form.peso),
      temperatura: form.temperatura === "" ? null : Number(form.temperatura),
      notas: form.notas.trim() || null,
      para_cobrar: form.para_cobrar.trim() || null,
    }
    try {
      if (editId) {
        const { error } = await supabase.from("consultas").update(payload).eq("id", editId)
        if (error) throw error
        mostrar("Consulta actualizada", "ok")
      } else {
        const { error } = await supabase.from("consultas").insert([payload])
        if (error) throw error
        mostrar("Consulta registrada", "ok")
      }
      setModal(false); cargar()
    } catch (e: any) {
      mostrar("Error: " + (e?.message || "desconocido"), "error")
    } finally { setGuardando(false) }
  }

  async function marcarCobrado(c: any, cobrado: boolean) {
    const { error } = await supabase.from("consultas").update({ cobrado }).eq("id", c.id)
    if (error) { mostrar("Error", "error"); return }
    setConsultas(prev => prev.map(x => x.id === c.id ? { ...x, cobrado } : x))
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("consultas").delete().eq("id", confirmEliminar.id)
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Consulta eliminada", "ok"); setConsultas(prev => prev.filter(c => c.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  const filtradas = consultas.filter(c => {
    if (filtroFecha && c.fecha !== filtroFecha) return false
    if (filtroPaciente && String(c.paciente_id) !== filtroPaciente) return false
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    const pac = c.pacientes
    const nombrePac = (pac?.nombre || "").toLowerCase()
    const tutor = pac?.clientes ? `${pac.clientes.nombre || ""} ${pac.clientes.apellido || ""}`.toLowerCase() : ""
    return nombrePac.includes(q) || tutor.includes(q) || (c.motivo || "").toLowerCase().includes(q)
  })
  const pacienteFiltrado = pacientes.find(p => String(p.id) === filtroPaciente)

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inputStyle, maxWidth: 165 }} />
          <button
            onClick={() => setFiltroFecha(filtroFecha ? "" : hoyISO())}
            style={{ background: filtroFecha ? "#f1f5f9" : "#6f7d49", color: filtroFecha ? "#475569" : "white", border: filtroFecha ? "1px solid #e2e8f0" : "none", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {filtroFecha ? "Ver todas" : "Hoy"}
          </button>
        </div>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por tutor, paciente o motivo…" style={{ ...inputStyle, maxWidth: 260, flex: 1 }} />
        <select value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 240, flex: 1 }}>
          <option value="">Todos los pacientes</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}</option>)}
        </select>
        <button onClick={abrirNueva}
          style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Nueva consulta
        </button>
      </div>

      {pacienteFiltrado && (
        <div style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13.5, color: "#4b5a2c", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>📋 Historia clínica de <b>{pacienteFiltrado.nombre}</b> — {filtradas.length} consulta(s)</span>
          <button onClick={() => setFiltroPaciente("")} style={{ background: "transparent", border: "none", color: "#6f7d49", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Ver todas ✕</button>
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>{consultas.length === 0 ? "Todavía no hay consultas" : "Sin consultas para este paciente"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtradas.map(c => {
            const pac = c.pacientes
            const dueño = pac?.clientes ? `${pac.clientes.nombre || ""} ${pac.clientes.apellido || ""}`.trim() : ""
            return (
              <div key={c.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1d1b12" }}>
                      {pac?.nombre || "Paciente"} {pac?.especie && <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: 13 }}>· {pac.especie}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      🗓 {fechaCorta(c.fecha)}{dueño && ` · Dueño: ${dueño}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => abrirEditar(c)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#475569" }}>✎</button>
                    <button onClick={() => setConfirmEliminar(c)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: "#334155" }}>
                  {c.para_cobrar && (
                    <div style={{ background: c.cobrado ? "#f0fdf4" : "#fff7ed", border: `1px solid ${c.cobrado ? "#bbf7d0" : "#fed7aa"}`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ color: c.cobrado ? "#16a34a" : "#c2410c", fontWeight: 800 }}>{c.cobrado ? "✓ Cobrado:" : "💲 A cobrar:"}</b>{" "}
                        <span style={{ fontWeight: 700, color: "#1d1b12", textDecoration: c.cobrado ? "line-through" : "none" }}>{c.para_cobrar}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!c.cobrado && c.pacientes?.cliente_id && (
                          <Link href={`/ventas?cliente=${c.pacientes.cliente_id}&cobrar=${encodeURIComponent(c.para_cobrar)}`}
                            title="Cobrar en Ventas (abre con el tutor cargado)"
                            style={{ background: "#1d1b12", color: "white", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>Cobrar →</Link>
                        )}
                        <button onClick={() => marcarCobrado(c, !c.cobrado)} style={{ background: c.cobrado ? "#f1f5f9" : "#16a34a", color: c.cobrado ? "#64748b" : "white", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{c.cobrado ? "Reabrir" : "Cobrado"}</button>
                      </div>
                    </div>
                  )}
                  {c.motivo && <div style={{ whiteSpace: "pre-wrap" }}><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Motivo:</b> {c.motivo}</div>}
                  {c.diagnostico && <div style={{ whiteSpace: "pre-wrap" }}><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Diagnóstico:</b> {c.diagnostico}</div>}
                  {c.tratamiento && <div style={{ whiteSpace: "pre-wrap" }}><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Tratamiento:</b> {c.tratamiento}</div>}
                  {(c.peso != null || c.temperatura != null) && (
                    <div style={{ display: "flex", gap: 16, color: "#475569" }}>
                      {c.peso != null && <span><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Peso:</b> {c.peso} kg</span>}
                      {c.temperatura != null && <span><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Temp:</b> {c.temperatura}°</span>}
                    </div>
                  )}
                  {c.notas && (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginTop: 2 }}>
                      <b style={{ color: "#4b5a2c", fontWeight: 800 }}>Notas:</b>{" "}
                      <span style={{ fontWeight: 700, color: "#1d1b12", whiteSpace: "pre-wrap" }}>{c.notas}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{editId ? "Editar consulta" : "Nueva consulta"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({ ...form, paciente_id: e.target.value })} style={inputStyle}>
                  <option value="">— Elegir —</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Motivo de consulta</label>
                <textarea value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} rows={3} placeholder="Ej: Control, vacunación, herida…" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Diagnóstico</label>
                <textarea value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Tratamiento</label>
                <textarea value={form.tratamiento} onChange={e => setForm({ ...form, tratamiento: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...labelStyle, color: "#b45309" }}>💲 Para cobrar (lo ve recepción)</label>
                <textarea value={form.para_cobrar} onChange={e => setForm({ ...form, para_cobrar: e.target.value })} rows={2} placeholder="Ej: Consulta + inyectable + medicación X" style={{ ...inputStyle, resize: "vertical", background: "#fffbeb", borderColor: "#fde68a" }} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <input type="number" step="0.01" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Temperatura (°C)</label>
                <input type="number" step="0.1" value={form.temperatura} onChange={e => setForm({ ...form, temperatura: e.target.value })} placeholder="0" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModal(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardando ? "not-allowed" : "pointer" }}>
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <div onClick={() => setConfirmEliminar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 6 }}>¿Eliminar esta consulta?</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
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
