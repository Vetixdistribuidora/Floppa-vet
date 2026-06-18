"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"

const OLIVA = "#6f7d49"
const TIPO_REG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  constante:  { label: "Constantes", icon: "🌡", bg: "#eff6ff", color: "#1d4ed8" },
  medicacion: { label: "Medicación", icon: "💊", bg: "#eef0e0", color: "#4b5a2c" },
  evolucion:  { label: "Evolución",  icon: "📝", bg: "#fffbeb", color: "#b45309" },
}

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }

function nowLocal() {
  const d = new Date(); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
function toLocalInput(iso: string) {
  const d = new Date(iso); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
function fmtFechaHora(s: string) {
  return new Date(s).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}
function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
const medVacio = () => ({ medicamento: "", dosis: "", frecuencia: "" })
const regVacio = () => ({ fecha_hora: nowLocal(), peso: "", temperatura: "", fc: "", fr: "", mucosas: "", meds: [medVacio()], evolucion: "", aplicado_por: "", nota: "" })

export default function InternacionPage() {
  const [lista, setLista] = useState<any[]>([])
  const [filtro, setFiltro] = useState<"internado" | "historial">("internado")
  const [activa, setActiva] = useState<any | null>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)

  const [modalNueva, setModalNueva] = useState(false)
  const [formNueva, setFormNueva] = useState<any>({ paciente_id: "", motivo: "", notas: "" })
  const [guardandoNueva, setGuardandoNueva] = useState(false)

  const [reg, setReg] = useState<any>(regVacio())
  const [guardandoReg, setGuardandoReg] = useState(false)
  const [confirmAlta, setConfirmAlta] = useState(false)
  const [editReg, setEditReg] = useState<any | null>(null)
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [confirmDelReg, setConfirmDelReg] = useState<any | null>(null)
  const [confirmDelInt, setConfirmDelInt] = useState(false)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const [{ data: ii }, { data: pac }] = await Promise.all([
      supabase.from("internaciones").select("*, pacientes(nombre, especie, raza), clientes(nombre, apellido, telefono)").order("fecha_ingreso", { ascending: false }),
      supabase.from("pacientes").select("id, nombre, especie, cliente_id").eq("fallecido", false).order("nombre"),
    ])
    setLista(ii || []); setPacientes(pac || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function abrirFicha(i: any) {
    setActiva(i); setReg(regVacio())
    const { data } = await supabase.from("internacion_registros").select("*").eq("internacion_id", i.id).order("fecha_hora", { ascending: false })
    setRegistros(data || [])
  }

  async function crearInternacion() {
    if (!formNueva.paciente_id) { mostrar("Elegí el paciente", "error"); return }
    setGuardandoNueva(true)
    const pac = pacientes.find(p => String(p.id) === formNueva.paciente_id)
    const payload = { paciente_id: Number(formNueva.paciente_id), cliente_id: pac?.cliente_id ?? null, motivo: formNueva.motivo.trim() || null, notas: formNueva.notas.trim() || null, estado: "internado" }
    const { data, error } = await supabase.from("internaciones").insert([payload]).select("*, pacientes(nombre, especie, raza), clientes(nombre, apellido, telefono)").single()
    setGuardandoNueva(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    setModalNueva(false); setFormNueva({ paciente_id: "", motivo: "", notas: "" })
    mostrar("Paciente internado", "ok")
    await cargar(); if (data) abrirFicha(data)
  }

  function setMed(i: number, campo: string, val: string) {
    setReg((r: any) => ({ ...r, meds: r.meds.map((m: any, idx: number) => idx === i ? { ...m, [campo]: val } : m) }))
  }
  function addMed() { setReg((r: any) => ({ ...r, meds: [...r.meds, medVacio()] })) }
  function removeMed(i: number) { setReg((r: any) => ({ ...r, meds: r.meds.length > 1 ? r.meds.filter((_: any, idx: number) => idx !== i) : r.meds })) }

  function medsATexto(meds: any[]): string {
    return meds
      .filter(m => (m.medicamento || "").trim())
      .map(m => {
        const partes = [m.medicamento.trim()]
        if ((m.dosis || "").trim()) partes.push(m.dosis.trim())
        if ((m.frecuencia || "").trim()) partes.push("cada " + m.frecuencia.trim())
        return "• " + partes.join(" · ")
      })
      .join("\n")
  }

  async function agregarRegistro() {
    if (!activa) return
    const hayConst = reg.peso || reg.temperatura || reg.fc || reg.fr || reg.mucosas
    const medsTxt = medsATexto(reg.meds)
    const hayMed = !!medsTxt
    const hayEvo = reg.evolucion.trim()
    if (!hayConst && !hayMed && !hayEvo) { mostrar("Cargá al menos un dato (constante, medicación o evolución)", "error"); return }
    setGuardandoReg(true)
    const base = {
      internacion_id: activa.id,
      fecha_hora: reg.fecha_hora ? new Date(reg.fecha_hora).toISOString() : new Date().toISOString(),
      aplicado_por: reg.aplicado_por.trim() || null,
    }
    const filas: any[] = []
    if (hayConst) filas.push({ ...base, tipo: "constante", peso: reg.peso ? Number(reg.peso) : null, temperatura: reg.temperatura ? Number(reg.temperatura) : null, fc: reg.fc ? Number(reg.fc) : null, fr: reg.fr ? Number(reg.fr) : null, mucosas: reg.mucosas.trim() || null })
    if (hayMed) filas.push({ ...base, tipo: "medicacion", tratamiento: medsTxt })
    if (hayEvo) filas.push({ ...base, tipo: "evolucion", tratamiento: reg.evolucion.trim() })
    if (reg.nota.trim() && filas.length) filas[0].nota = reg.nota.trim()
    const { data, error } = await supabase.from("internacion_registros").insert(filas).select("*")
    setGuardandoReg(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    setRegistros(prev => [...(data || []), ...prev].sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora))))
    setReg({ ...regVacio(), aplicado_por: reg.aplicado_por })
    mostrar(`${filas.length} registro${filas.length > 1 ? "s" : ""} agregado${filas.length > 1 ? "s" : ""}`, "ok")
  }

  async function guardarEdicionReg() {
    if (!editReg) return
    setGuardandoEdit(true)
    const payload: any = {
      fecha_hora: editReg.fecha_hora ? new Date(editReg.fecha_hora).toISOString() : new Date().toISOString(),
      aplicado_por: (editReg.aplicado_por || "").trim() || null,
      nota: (editReg.nota || "").trim() || null,
    }
    if (editReg.tipo === "constante") {
      Object.assign(payload, {
        peso: editReg.peso !== "" && editReg.peso != null ? Number(editReg.peso) : null,
        temperatura: editReg.temperatura !== "" && editReg.temperatura != null ? Number(editReg.temperatura) : null,
        fc: editReg.fc !== "" && editReg.fc != null ? Number(editReg.fc) : null,
        fr: editReg.fr !== "" && editReg.fr != null ? Number(editReg.fr) : null,
        mucosas: (editReg.mucosas || "").trim() || null,
      })
    } else {
      payload.tratamiento = (editReg.tratamiento || "").trim() || null
    }
    const { data, error } = await supabase.from("internacion_registros").update(payload).eq("id", editReg.id).select("*").single()
    setGuardandoEdit(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    setRegistros(prev => prev.map(r => r.id === editReg.id ? data : r))
    setEditReg(null); mostrar("Registro actualizado", "ok")
  }

  async function eliminarReg() {
    if (!confirmDelReg) return
    const { error } = await supabase.from("internacion_registros").delete().eq("id", confirmDelReg.id)
    if (error) { mostrar("Error al eliminar", "error") }
    else { setRegistros(prev => prev.filter(r => r.id !== confirmDelReg.id)); mostrar("Registro eliminado", "ok") }
    setConfirmDelReg(null)
  }

  async function eliminarInternacion() {
    if (!activa) return
    const { error } = await supabase.from("internaciones").delete().eq("id", activa.id)
    if (error) { mostrar("Error al eliminar", "error"); setConfirmDelInt(false); return }
    setConfirmDelInt(false); setActiva(null); mostrar("Internación eliminada", "ok"); cargar()
  }

  async function darDeAlta() {
    if (!activa) return
    await supabase.from("internaciones").update({ estado: "alta", fecha_egreso: new Date().toISOString() }).eq("id", activa.id)
    setConfirmAlta(false); mostrar("Paciente dado de alta", "ok")
    setActiva(null); cargar()
  }

  const filtrada = lista.filter(i => filtro === "internado" ? i.estado === "internado" : i.estado !== "internado")
  const internados = lista.filter(i => i.estado === "internado").length

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 10 }}>
          {(["internado", "historial"] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{ border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: filtro === f ? "white" : "transparent", color: filtro === f ? "#1d1b12" : "#64748b", boxShadow: filtro === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {f === "internado" ? `Internados (${internados})` : "Historial"}
            </button>
          ))}
        </div>
        <button onClick={() => setModalNueva(true)} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Internar paciente</button>
      </div>

      <div className="grid-sidebar-main" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>
        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cargando ? <p style={{ color: "#94a3b8", padding: 20 }}>Cargando…</p>
            : filtrada.length === 0 ? <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{filtro === "internado" ? "No hay pacientes internados" : "Sin historial"}</div>
            : filtrada.map(i => {
              const sel = activa?.id === i.id
              return (
                <div key={i.id} onClick={() => abrirFicha(i)} style={{ background: sel ? "#f4f2e6" : "white", border: `1px solid ${sel ? "#cdd6a8" : "#e2e8f0"}`, borderLeft: sel ? "3px solid #6f7d49" : "3px solid transparent", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1d1b12" }}>🐾 {i.pacientes?.nombre || "—"}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{i.motivo || "Sin motivo"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    {i.estado === "internado" ? `Ingresó ${fmtFecha(i.fecha_ingreso)}` : `Alta ${i.fecha_egreso ? fmtFecha(i.fecha_egreso) : ""}`}
                  </div>
                </div>
              )
            })}
        </div>

        {/* Detalle */}
        {!activa ? (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏥</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Elegí un paciente internado</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>para ver y cargar su hoja de internación</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Cabecera */}
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>🐾 {activa.pacientes?.nombre}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}> {activa.pacientes?.especie ? `· ${activa.pacientes.especie}` : ""}{activa.pacientes?.raza ? ` ${activa.pacientes.raza}` : ""}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                    {activa.clientes && <span>👤 {activa.clientes.nombre} {activa.clientes.apellido} </span>}
                    {activa.motivo && <span>· {activa.motivo}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                    Ingreso: {fmtFechaHora(activa.fecha_ingreso)}{activa.estado !== "internado" && activa.fecha_egreso ? ` · Alta: ${fmtFechaHora(activa.fecha_egreso)}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {activa.estado === "internado"
                    ? <button onClick={() => setConfirmAlta(true)} style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ Dar de alta</button>
                    : <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 9, padding: "7px 14px", fontSize: 12.5, fontWeight: 700 }}>Dado de alta</span>}
                  <button onClick={() => setConfirmDelInt(true)} title="Eliminar internación" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            </div>

            {/* Form de nuevo registro (solo si internado) — todo junto */}
            {activa.estado === "internado" && (
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1d1b12" }}>+ Agregar a la hoja</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div><label style={{ ...labelStyle, marginBottom: 2 }}>Fecha y hora</label>
                      <input type="datetime-local" value={reg.fecha_hora} onChange={e => setReg({ ...reg, fecha_hora: e.target.value })} style={{ ...inputStyle, width: "auto", padding: "7px 10px" }} /></div>
                    <div><label style={{ ...labelStyle, marginBottom: 2 }}>Aplicado por</label>
                      <input value={reg.aplicado_por} onChange={e => setReg({ ...reg, aplicado_por: e.target.value })} placeholder="Quién" style={{ ...inputStyle, width: 140, padding: "7px 10px" }} /></div>
                  </div>
                </div>

                {/* Constantes */}
                <div style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 8 }}>🌡 Constantes <span style={{ color: "#94a3b8", fontWeight: 500 }}>(opcional)</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10 }}>
                    <div><label style={labelStyle}>Peso (kg)</label><input type="number" value={reg.peso} onChange={e => setReg({ ...reg, peso: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Temp (°C)</label><input type="number" value={reg.temperatura} onChange={e => setReg({ ...reg, temperatura: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>FC (lpm)</label><input type="number" value={reg.fc} onChange={e => setReg({ ...reg, fc: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>FR (rpm)</label><input type="number" value={reg.fr} onChange={e => setReg({ ...reg, fr: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Mucosas</label><input value={reg.mucosas} onChange={e => setReg({ ...reg, mucosas: e.target.value })} placeholder="rosadas…" style={inputStyle} /></div>
                  </div>
                </div>

                {/* Medicación: filas repetibles */}
                <div style={{ marginTop: 4 }}>
                  <label style={labelStyle}>💊 Medicación</label>
                  {reg.meds.map((m: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                      <input value={m.medicamento} onChange={e => setMed(i, "medicamento", e.target.value)} placeholder="Medicamento" style={{ ...inputStyle, flex: 2 }} />
                      <input value={m.dosis} onChange={e => setMed(i, "dosis", e.target.value)} placeholder="Dosis (ej: 2mg/kg)" style={{ ...inputStyle, flex: 1 }} />
                      <input value={m.frecuencia} onChange={e => setMed(i, "frecuencia", e.target.value)} placeholder="Cada cuánto (ej: 8h)" style={{ ...inputStyle, flex: 1 }} />
                      <button type="button" onClick={() => removeMed(i)} disabled={reg.meds.length === 1} title="Quitar"
                        style={{ background: reg.meds.length === 1 ? "#f8fafc" : "#fef2f2", border: `1px solid ${reg.meds.length === 1 ? "#e2e8f0" : "#fecaca"}`, color: reg.meds.length === 1 ? "#cbd5e1" : "#dc2626", borderRadius: 8, padding: "8px 11px", fontSize: 13, cursor: reg.meds.length === 1 ? "default" : "pointer", flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={addMed} style={{ background: "#eef0e0", border: "1px solid #cdd6a8", color: "#4b5a2c", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ Agregar medicamento</button>
                </div>

                {/* Evolución */}
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>📝 Evolución</label>
                  <textarea value={reg.evolucion} onChange={e => setReg({ ...reg, evolucion: e.target.value })} rows={2} placeholder="Estado general, observaciones…" style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Nota</label>
                  <input value={reg.nota} onChange={e => setReg({ ...reg, nota: e.target.value })} placeholder="Opcional" style={inputStyle} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Cargá lo que tengas: se guarda cada parte en la hoja con esta misma hora.</span>
                  <button onClick={agregarRegistro} disabled={guardandoReg} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardandoReg ? "not-allowed" : "pointer" }}>{guardandoReg ? "Guardando…" : "+ Agregar a la hoja"}</button>
                </div>
              </div>
            )}

            {/* Timeline de registros */}
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#1d1b12" }}>📋 Hoja de internación ({registros.length})</h3>
              {registros.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Todavía no hay registros.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {registros.map(r => {
                    const v = TIPO_REG[r.tipo] || TIPO_REG.evolucion
                    return (
                      <div key={r.id} style={{ display: "flex", gap: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                        <div style={{ minWidth: 86, fontSize: 12, color: "#64748b", fontWeight: 600 }}>{fmtFechaHora(r.fecha_hora)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ background: v.bg, color: v.color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{v.icon} {v.label}</span>
                          {r.tipo === "constante" ? (
                            <div style={{ fontSize: 13, color: "#1d1b12", marginTop: 5, display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {r.peso != null && <span><b>Peso:</b> {r.peso} kg</span>}
                              {r.temperatura != null && <span><b>Temp:</b> {r.temperatura}°</span>}
                              {r.fc != null && <span><b>FC:</b> {r.fc}</span>}
                              {r.fr != null && <span><b>FR:</b> {r.fr}</span>}
                              {r.mucosas && <span><b>Mucosas:</b> {r.mucosas}</span>}
                            </div>
                          ) : (
                            <div style={{ fontSize: 13.5, color: "#1d1b12", marginTop: 5, whiteSpace: "pre-wrap" }}>{r.tratamiento}</div>
                          )}
                          {r.nota && <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>{r.nota}</div>}
                          {r.aplicado_por && <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>👤 {r.aplicado_por}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setEditReg({ ...r, fecha_hora: toLocalInput(r.fecha_hora), peso: r.peso ?? "", temperatura: r.temperatura ?? "", fc: r.fc ?? "", fr: r.fr ?? "", mucosas: r.mucosas ?? "", tratamiento: r.tratamiento ?? "", aplicado_por: r.aplicado_por ?? "", nota: r.nota ?? "" })} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#475569", height: "fit-content" }}>✎</button>
                          <button onClick={() => setConfirmDelReg(r)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#dc2626", height: "fit-content" }}>🗑</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal editar registro */}
      {editReg && (
        <div onClick={() => setEditReg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800, color: "#1d1b12" }}>Editar {(TIPO_REG[editReg.tipo] || TIPO_REG.evolucion).label.toLowerCase()}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Fecha y hora</label><input type="datetime-local" value={editReg.fecha_hora} onChange={e => setEditReg({ ...editReg, fecha_hora: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Aplicado por</label><input value={editReg.aplicado_por} onChange={e => setEditReg({ ...editReg, aplicado_por: e.target.value })} style={inputStyle} /></div>
              {editReg.tipo === "constante" ? (
                <>
                  <div><label style={labelStyle}>Peso (kg)</label><input type="number" value={editReg.peso} onChange={e => setEditReg({ ...editReg, peso: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Temp (°C)</label><input type="number" value={editReg.temperatura} onChange={e => setEditReg({ ...editReg, temperatura: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>FC (lpm)</label><input type="number" value={editReg.fc} onChange={e => setEditReg({ ...editReg, fc: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>FR (rpm)</label><input type="number" value={editReg.fr} onChange={e => setEditReg({ ...editReg, fr: e.target.value })} style={inputStyle} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Mucosas</label><input value={editReg.mucosas} onChange={e => setEditReg({ ...editReg, mucosas: e.target.value })} style={inputStyle} /></div>
                </>
              ) : (
                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>{editReg.tipo === "medicacion" ? "Medicación / tratamiento" : "Evolución"}</label><textarea value={editReg.tratamiento} onChange={e => setEditReg({ ...editReg, tratamiento: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
              )}
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Nota</label><input value={editReg.nota} onChange={e => setEditReg({ ...editReg, nota: e.target.value })} style={inputStyle} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditReg(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarEdicionReg} disabled={guardandoEdit} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardandoEdit ? "not-allowed" : "pointer" }}>{guardandoEdit ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar registro */}
      {confirmDelReg && (
        <div onClick={() => setConfirmDelReg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 20 }}>¿Eliminar este registro de la hoja?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setConfirmDelReg(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={eliminarReg} style={{ background: "#dc2626", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 700, color: "white", cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar internación */}
      {confirmDelInt && (
        <div onClick={() => setConfirmDelInt(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 6 }}>¿Eliminar la internación de {activa?.pacientes?.nombre}?</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Se borra también toda su hoja de internación. No se puede deshacer.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setConfirmDelInt(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={eliminarInternacion} style={{ background: "#dc2626", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 700, color: "white", cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva internación */}
      {modalNueva && (
        <div onClick={() => setModalNueva(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>Internar paciente</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Paciente *</label>
                <ComboBox
                  options={pacientes.map(p => ({ value: String(p.id), label: `${p.nombre}${p.especie ? ` (${p.especie})` : ""}` }))}
                  value={formNueva.paciente_id}
                  onChange={v => setFormNueva({ ...formNueva, paciente_id: v })}
                  placeholder="Buscar paciente…"
                  emptyLabel="— Elegir —"
                />
              </div>
              <div>
                <label style={labelStyle}>Motivo de internación</label>
                <input value={formNueva.motivo} onChange={e => setFormNueva({ ...formNueva, motivo: e.target.value })} placeholder="Ej: Postquirúrgico, gastroenteritis…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={formNueva.notas} onChange={e => setFormNueva({ ...formNueva, notas: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalNueva(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={crearInternacion} disabled={guardandoNueva} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardandoNueva ? "not-allowed" : "pointer" }}>{guardandoNueva ? "Guardando…" : "Internar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar alta */}
      {confirmAlta && (
        <div onClick={() => setConfirmAlta(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>✓</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 20 }}>¿Dar de alta a {activa?.pacientes?.nombre}?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setConfirmAlta(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={darDeAlta} style={{ background: "#15803d", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 700, color: "white", cursor: "pointer" }}>Dar de alta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
