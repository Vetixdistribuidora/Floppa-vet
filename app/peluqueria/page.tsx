"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const ROSA = "#ec4899"
const SERVICIOS = ["Peluquería", "Baño", "Baño y corte", "Corte de uñas", "Deslanado", "Limpieza de oídos", "Otro"]
const hoyISO = () => new Date().toISOString().split("T")[0]

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

function fechaLarga(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
}
function addDias(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]
}
function fmt(n: any) { const v = Number(n); return "$" + (isNaN(v) ? 0 : v).toLocaleString("es-AR") }

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }
const th: React.CSSProperties = { background: ROSA, color: "white", padding: "9px 10px", textAlign: "left", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.3 }
const td: React.CSSProperties = { padding: "9px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 13.5, color: "#1d1b12", verticalAlign: "top" }

const formVacio = () => ({ id: null as number | null, hora: "", canil: "", nombre: "", raza: "", servicio: "", propietario_nombre: "", propietario_apellido: "", propietario_telefono: "", precio: "", observaciones: "" })

export default function PeluqueriaPage() {
  const [fecha, setFecha] = useState(hoyISO())
  const [turnos, setTurnos] = useState<any[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [porcentaje, setPorcentaje] = useState<string>("60")
  const [porcGuardado, setPorcGuardado] = useState<string>("60")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargarOrg() {
    const { data: org } = await supabase.from("organizaciones").select("id, peluqueria_porcentaje").maybeSingle()
    setOrgId((org as any)?.id ?? null)
    const p = (org as any)?.peluqueria_porcentaje
    setPorcentaje(p != null ? String(p) : "60"); setPorcGuardado(p != null ? String(p) : "60")
  }
  async function cargarTurnos() {
    setCargando(true)
    const { data } = await supabase.from("peluqueria_turnos").select("*").eq("fecha", fecha).order("hora", { ascending: true }).order("id", { ascending: true })
    setTurnos(data || [])
    setCargando(false)
  }
  useEffect(() => { cargarOrg() }, [])
  useEffect(() => { cargarTurnos() }, [fecha])

  function abrirNuevo() { setForm(formVacio()); setModal(true) }
  function abrirEditar(t: any) {
    setForm({
      id: t.id, hora: t.hora || "", canil: t.canil || "", nombre: t.nombre || "", raza: t.raza || "", servicio: t.servicio || "",
      propietario_nombre: t.propietario_nombre || "", propietario_apellido: t.propietario_apellido || "", propietario_telefono: t.propietario_telefono || "",
      precio: t.precio != null ? String(t.precio) : "", observaciones: t.observaciones || "",
    })
    setModal(true)
  }

  async function guardar() {
    setGuardando(true)
    const payload: any = {
      fecha, hora: form.hora.trim() || null, canil: form.canil.trim() || null,
      nombre: form.nombre.trim() || null, raza: form.raza.trim() || null, servicio: form.servicio.trim() || null,
      propietario_nombre: form.propietario_nombre.trim() || null, propietario_apellido: form.propietario_apellido.trim() || null,
      propietario_telefono: form.propietario_telefono.trim() || null,
      precio: form.precio !== "" && !isNaN(Number(form.precio)) ? Number(form.precio) : null,
      observaciones: form.observaciones.trim() || null,
    }
    try {
      if (form.id) {
        const { error } = await supabase.from("peluqueria_turnos").update(payload).eq("id", form.id); if (error) throw error
        mostrar("Turno actualizado", "ok")
      } else {
        const { error } = await supabase.from("peluqueria_turnos").insert([payload]); if (error) throw error
        mostrar("Turno agregado", "ok")
      }
      setModal(false); cargarTurnos()
    } catch (e: any) { mostrar("Error: " + (e?.message || "desconocido"), "error") } finally { setGuardando(false) }
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("peluqueria_turnos").delete().eq("id", confirmEliminar.id)
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Turno eliminado", "ok"); setTurnos(prev => prev.filter(x => x.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  async function guardarPorcentaje() {
    const n = Number(porcentaje)
    if (isNaN(n) || n < 0 || n > 100) { setPorcentaje(porcGuardado); mostrar("Poné un porcentaje entre 0 y 100", "error"); return }
    if (String(n) === porcGuardado || !orgId) return
    const { error } = await supabase.from("organizaciones").update({ peluqueria_porcentaje: n }).eq("id", orgId)
    if (error) { mostrar("No se pudo guardar el %", "error"); return }
    setPorcGuardado(String(n)); mostrar("Porcentaje guardado", "ok")
  }

  const total = turnos.reduce((s, t) => s + (Number(t.precio) || 0), 0)
  const pct = Math.min(100, Math.max(0, Number(porcentaje) || 0))
  const montoPeluquero = total * pct / 100
  const montoClinica = total - montoPeluquero

  const nombreMascota = (t: any) => [t.nombre, t.raza].filter(Boolean).join(" · ") || "—"
  const propietario = (t: any) => `${t.propietario_nombre || ""} ${t.propietario_apellido || ""}`.trim() || "—"

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      {/* Navegación de día */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setFecha(addDias(fecha, -1))} title="Día anterior" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: "#475569" }}>←</button>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value || hoyISO())} style={{ ...inputStyle, width: "auto", padding: "8px 12px" }} />
          <button onClick={() => setFecha(addDias(fecha, 1))} title="Día siguiente" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: "#475569" }}>→</button>
          <button onClick={() => setFecha(hoyISO())} style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#be185d" }}>Hoy</button>
        </div>
        <button onClick={abrirNuevo} style={{ background: ROSA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Agregar turno</button>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#1d1b12", textTransform: "capitalize", marginBottom: 12 }}>✂️ Peluquería · {fechaLarga(fecha)}</div>

      {/* Planilla */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr>
                <th style={th}>Hora</th><th style={th}>Canil</th><th style={th}>Mascota / Raza</th><th style={th}>Servicio</th>
                <th style={th}>Propietario</th><th style={th}>Celular</th><th style={{ ...th, textAlign: "right" }}>Precio</th>
                <th style={th}>Observaciones</th><th style={{ ...th, textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td style={{ ...td, textAlign: "center", padding: 30, color: "#94a3b8" }} colSpan={9}>Cargando…</td></tr>
              ) : turnos.length === 0 ? (
                <tr><td style={{ ...td, textAlign: "center", padding: 34, color: "#94a3b8" }} colSpan={9}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>✂️</div>
                  Sin turnos para este día. Agregá con “+ Agregar turno”.
                </td></tr>
              ) : turnos.map(t => (
                <tr key={t.id}>
                  <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{t.hora || "—"}</td>
                  <td style={td}>{t.canil || "—"}</td>
                  <td style={td}>{nombreMascota(t)}</td>
                  <td style={td}>{t.servicio ? <span style={{ background: "#fdf2f8", color: "#be185d", fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{t.servicio}</span> : "—"}</td>
                  <td style={td}>{propietario(t)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{t.propietario_telefono || "—"}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{t.precio != null ? fmt(t.precio) : "—"}</td>
                  <td style={{ ...td, color: "#64748b", fontSize: 12.5 }}>{t.observaciones || ""}</td>
                  <td style={{ ...td, whiteSpace: "nowrap", textAlign: "center" }}>
                    <button onClick={() => abrirEditar(t)} title="Editar" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 12, color: "#475569", marginRight: 5 }}>✎</button>
                    <button onClick={() => setConfirmEliminar(t)} title="Eliminar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <div style={{ background: "#1d1b12", color: "white", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Total del día</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(total)}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{turnos.length} turno{turnos.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ background: "white", border: `1px solid #fbcfe8`, borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#be185d", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Peluquero/a</span>
            <input type="number" min="0" max="100" value={porcentaje}
              onChange={e => setPorcentaje(e.target.value)} onBlur={guardarPorcentaje}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
              style={{ width: 58, padding: "3px 6px", border: "1px solid #fbcfe8", borderRadius: 7, fontSize: 13, fontWeight: 700, color: "#be185d", textAlign: "center", outline: "none" }} />
            <span style={{ fontSize: 13, color: "#be185d", fontWeight: 700 }}>%</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: ROSA, marginTop: 4 }}>{fmt(montoPeluquero)}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>El % se guarda para tu clínica</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Queda para la clínica</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#15803d", marginTop: 4 }}>{fmt(montoClinica)}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{(100 - pct).toFixed(0)}% del total</div>
        </div>
      </div>

      {/* Modal alta / edición */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{form.id ? "Editar turno" : "Nuevo turno"}</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b", textTransform: "capitalize" }}>{fechaLarga(fecha)}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Hora</label>
                <input value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} placeholder="Ej: 8:30" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Canil</label>
                <input value={form.canil} onChange={e => setForm({ ...form, canil: e.target.value })} placeholder="Ej: 3" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mascota (nombre)</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Opcional" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Raza</label>
                <input value={form.raza} onChange={e => setForm({ ...form, raza: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Servicio</label>
                <input list="servicios-pel" value={form.servicio} onChange={e => setForm({ ...form, servicio: e.target.value })} placeholder="Peluquería, baño…" style={inputStyle} />
                <datalist id="servicios-pel">{SERVICIOS.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <label style={labelStyle}>Precio</label>
                <input type="number" min="0" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="$" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Propietario · Nombre</label>
                <input value={form.propietario_nombre} onChange={e => setForm({ ...form, propietario_nombre: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Propietario · Apellido</label>
                <input value={form.propietario_apellido} onChange={e => setForm({ ...form, propietario_apellido: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Celular</label>
                <input value={form.propietario_telefono} onChange={e => setForm({ ...form, propietario_telefono: e.target.value })} placeholder="Para contactarlo" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Observaciones</label>
                <input value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModal(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ background: ROSA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardando ? "wait" : "pointer" }}>{guardando ? "Guardando…" : form.id ? "Guardar cambios" : "Agregar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <div onClick={() => setConfirmEliminar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 20 }}>¿Eliminar este turno de peluquería?</p>
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
