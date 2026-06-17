"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"

const ESPECIES = ["Perro", "Gato", "Ave", "Conejo", "Roedor", "Reptil", "Equino", "Otro"]
const ESPECIE_EMOJI: Record<string, string> = { Perro: "🐶", Gato: "🐱", Ave: "🐦", Conejo: "🐰", Roedor: "🐹", Reptil: "🦎", Equino: "🐴", Otro: "🐾" }
const emojiEsp = (e: string | null) => ESPECIE_EMOJI[e || ""] || "🐾"
const OLIVA = "#6f7d49"

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

function edadDe(fecha: string | null): string {
  if (!fecha) return "—"
  const n = new Date(fecha + "T00:00:00")
  const hoy = new Date()
  let meses = (hoy.getFullYear() - n.getFullYear()) * 12 + (hoy.getMonth() - n.getMonth())
  if (hoy.getDate() < n.getDate()) meses--
  if (meses < 0) return "—"
  const años = Math.floor(meses / 12)
  const m = meses % 12
  if (años === 0) return `${m} mes${m !== 1 ? "es" : ""}`
  return `${años} año${años !== 1 ? "s" : ""}${m ? ` ${m}m` : ""}`
}

const ETIQUETAS_SUGERIDAS = ["Reproductor", "Donante", "Castrado/a", "Gestante", "Con crías", "Agresivo"]

// Próximo cumpleaños: día/mes y cuántos días faltan
function cumpleInfo(fecha: string | null) {
  if (!fecha) return null
  const n = new Date(fecha + "T00:00:00")
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  let prox = new Date(hoy.getFullYear(), n.getMonth(), n.getDate())
  if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, n.getMonth(), n.getDate())
  const dias = Math.round((prox.getTime() - hoy.getTime()) / 86400000)
  return { dia: `${String(n.getDate()).padStart(2, "0")}/${String(n.getMonth() + 1).padStart(2, "0")}`, dias }
}

const FORM_VACIO = { nombre: "", especie: "Perro", raza: "", sexo: "", fecha_nacimiento: "", peso: "", color: "", cliente_id: "", notas: "", etiquetas: [] as string[] }

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [conCobro, setConCobro] = useState<Set<number>>(new Set())

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const [{ data: pac }, { data: cli }, { data: cobros }] = await Promise.all([
      supabase.from("pacientes").select("*, clientes(nombre, apellido)").order("nombre"),
      supabase.from("clientes").select("id, nombre, apellido").order("nombre"),
      supabase.from("consultas").select("paciente_id").not("para_cobrar", "is", null).eq("cobrado", false),
    ])
    setPacientes(pac || [])
    setClientes(cli || [])
    setConCobro(new Set((cobros || []).map((c: any) => c.paciente_id)))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  function abrirNuevo() { setEditId(null); setForm(FORM_VACIO); setModal(true) }
  function abrirEditar(p: any) {
    setEditId(p.id)
    setForm({
      nombre: p.nombre || "", especie: p.especie || "Perro", raza: p.raza || "", sexo: p.sexo || "",
      fecha_nacimiento: p.fecha_nacimiento || "", peso: p.peso ?? "", color: p.color || "",
      cliente_id: p.cliente_id ? String(p.cliente_id) : "", notas: p.notas || "", etiquetas: p.etiquetas || [],
    })
    setModal(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { mostrar("El nombre es obligatorio", "error"); return }
    setGuardando(true)
    const payload = {
      nombre: form.nombre.trim(), especie: form.especie || null, raza: form.raza.trim() || null,
      sexo: form.sexo || null, fecha_nacimiento: form.fecha_nacimiento || null,
      peso: form.peso === "" ? null : Number(form.peso), color: form.color.trim() || null,
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null, notas: form.notas.trim() || null,
      etiquetas: form.etiquetas || [],
    }
    try {
      if (editId) {
        const { error } = await supabase.from("pacientes").update(payload).eq("id", editId)
        if (error) throw error
        mostrar("Paciente actualizado", "ok")
      } else {
        const { error } = await supabase.from("pacientes").insert([payload])
        if (error) throw error
        mostrar("Paciente agregado", "ok")
      }
      setModal(false)
      cargar()
    } catch (e: any) {
      mostrar("Error: " + (e?.message || "desconocido"), "error")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("pacientes").delete().eq("id", confirmEliminar.id)
    if (error) { mostrar("Error al eliminar", "error") } else { mostrar("Paciente eliminado", "ok"); setPacientes(prev => prev.filter(p => p.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  const filtrados = pacientes.filter(p => {
    const q = busqueda.toLowerCase()
    const dueño = p.clientes ? `${p.clientes.nombre || ""} ${p.clientes.apellido || ""}` : ""
    return p.nombre?.toLowerCase().includes(q) || p.especie?.toLowerCase().includes(q) ||
      p.raza?.toLowerCase().includes(q) || dueño.toLowerCase().includes(q)
  })

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, especie, raza o dueño…"
          style={{ ...inputStyle, maxWidth: 360, flex: 1 }}
        />
        <button onClick={abrirNuevo}
          style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Nuevo paciente
        </button>
      </div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐾</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>{pacientes.length === 0 ? "Todavía no hay pacientes" : "Sin resultados"}</p>
          {pacientes.length === 0 && <p style={{ fontSize: 13, marginTop: 4 }}>Agregá el primero con “+ Nuevo paciente”.</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtrados.map(p => (
            <div key={p.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/pacientes/${p.id}`} title="Ver ficha completa" style={{ fontWeight: 700, fontSize: 16, color: "#4b5a2c", textDecoration: "none" }}>
                      <span>{emojiEsp(p.especie)}</span> {p.nombre}
                      {p.raza && <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: 14 }}> · {p.raza}</span>}
                    </Link>
                    {conCobro.has(p.id) && <span style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>💲 A cobrar</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{p.especie || "—"}</div>
                  {(p.etiquetas || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                      {p.etiquetas.map((et: string) => <span key={et} style={{ background: "#eef0e0", color: "#4b5a2c", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{et}</span>)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Link href={`/consultas?paciente=${p.id}`} title="Historia clínica" style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#6f7d49", textDecoration: "none" }}>📋</Link>
                  <Link href={`/estudios?paciente=${p.id}`} title="Estudios" style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#0891b2", textDecoration: "none" }}>📎</Link>
                  <button onClick={() => abrirEditar(p)} title="Editar" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#475569" }}>✎</button>
                  <button onClick={() => setConfirmEliminar(p)} title="Eliminar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#475569", marginTop: 8 }}>
                <span><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Edad:</b> {edadDe(p.fecha_nacimiento)}</span>
                {p.sexo && <span><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Sexo:</b> {p.sexo}</span>}
                {p.peso != null && <span><b style={{ color: "#4b5a2c", fontWeight: 800 }}>Peso:</b> {p.peso} kg</span>}
                {(() => { const c = cumpleInfo(p.fecha_nacimiento); return c ? <span style={{ color: c.dias === 0 ? "#d97706" : "#475569", fontWeight: c.dias === 0 ? 700 : 400 }}>🎂 {c.dia}{c.dias === 0 ? " ¡hoy!" : c.dias <= 30 ? ` (en ${c.dias}d)` : ""}</span> : null })()}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9", fontSize: 12.5, color: "#475569" }}>
                <b style={{ color: "#4b5a2c", fontWeight: 800 }}>Tutor:</b>{" "}
                {p.clientes ? `${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim() : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>sin asignar</span>}
              </div>
              {p.notas && (
                <div style={{ marginTop: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                  <b style={{ color: "#b45309", fontWeight: 800 }}>Nota:</b>{" "}
                  <span style={{ fontWeight: 700, color: "#1d1b12", whiteSpace: "pre-wrap" }}>{p.notas}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{editId ? "Editar paciente" : "Nuevo paciente"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Firulais" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Especie</label>
                <select value={form.especie} onChange={e => setForm({ ...form, especie: e.target.value })} style={inputStyle}>
                  {ESPECIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Raza</label>
                <input value={form.raza} onChange={e => setForm({ ...form, raza: e.target.value })} placeholder="Ej: Labrador" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sexo</label>
                <select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })} style={inputStyle}>
                  <option value="">—</option><option value="Macho">Macho</option><option value="Hembra">Hembra</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de nacimiento</label>
                <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <input type="number" step="0.01" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Color / seña</label>
                <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="Ej: Marrón" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Tutor</label>
                <ComboBox
                  options={clientes.map(c => ({ value: String(c.id), label: `${c.nombre || ""} ${c.apellido || ""}`.trim() }))}
                  value={form.cliente_id}
                  onChange={v => setForm({ ...form, cliente_id: v })}
                  placeholder="Buscar tutor…"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nota / patología de base</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} placeholder="Alergias, patología de base, observaciones…" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Etiquetas</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ETIQUETAS_SUGERIDAS.map(et => {
                    const on = (form.etiquetas || []).includes(et)
                    return (
                      <button key={et} type="button"
                        onClick={() => setForm({ ...form, etiquetas: on ? form.etiquetas.filter((x: string) => x !== et) : [...(form.etiquetas || []), et] })}
                        style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700, border: on ? "1.5px solid #6f7d49" : "1px solid #e2e8f0", background: on ? "#f4f2e6" : "white", color: on ? "#4b5a2c" : "#64748b" }}>
                        {on ? "✓ " : ""}{et}
                      </button>
                    )
                  })}
                </div>
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
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 6 }}>¿Eliminar a {confirmEliminar.nombre}?</p>
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
