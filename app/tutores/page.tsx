"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const OLIVA = "#6f7d49"

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }
const ESPECIES = ["Perro", "Gato", "Conejo", "Ave", "Roedor", "Otro"]
const SEXOS = ["Macho", "Hembra"]
const FORM_VACIO = { nombre: "", apellido: "", telefono: "", email: "", localidad: "", pacNombre: "", pacEspecie: "Perro", pacRaza: "", pacSexo: "", pacNac: "" }

export default function TutoresPage() {
  const [tutores, setTutores] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from("clientes").select("id, nombre, apellido, telefono, email, localidad, pacientes(nombre)").order("nombre")
    setTutores(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  function abrirNuevo() { setEditId(null); setForm(FORM_VACIO); setModal(true) }
  function abrirEditar(t: any) {
    setEditId(t.id)
    setForm({ ...FORM_VACIO, nombre: t.nombre || "", apellido: t.apellido || "", telefono: t.telefono || "", email: t.email || "", localidad: t.localidad || "" })
    setModal(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { mostrar("El nombre es obligatorio", "error"); return }
    setGuardando(true)
    const payload = { nombre: form.nombre.trim(), apellido: form.apellido.trim(), telefono: form.telefono.trim(), email: form.email.trim() || null, localidad: form.localidad.trim() }
    try {
      if (editId) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editId); if (error) throw error
        mostrar("Tutor actualizado", "ok")
      } else {
        const { data: nuevo, error } = await supabase.from("clientes").insert([payload]).select("id").single(); if (error) throw error
        // Si cargó una primera mascota, crearla en pacientes ligada al tutor
        if (form.pacNombre.trim() && nuevo?.id) {
          const { error: ePac } = await supabase.from("pacientes").insert([{
            cliente_id: nuevo.id,
            nombre: form.pacNombre.trim(),
            especie: form.pacEspecie || null,
            raza: form.pacRaza.trim() || null,
            sexo: form.pacSexo || null,
            fecha_nacimiento: form.pacNac || null,
          }])
          if (ePac) { mostrar("Tutor creado, pero falló la mascota: " + ePac.message, "error"); setModal(false); cargar(); return }
          mostrar("Tutor y mascota agregados", "ok")
        } else {
          mostrar("Tutor agregado", "ok")
        }
      }
      setModal(false); cargar()
    } catch (e: any) { mostrar("Error: " + (e?.message || "desconocido"), "error") } finally { setGuardando(false) }
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("clientes").delete().eq("id", confirmEliminar.id)
    if (error) mostrar("No se puede eliminar (tiene movimientos asociados)", "error")
    else { mostrar("Tutor eliminado", "ok"); setTutores(prev => prev.filter(t => t.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  const filtrados = tutores.filter(t => {
    const q = busqueda.toLowerCase()
    const nombre = `${t.nombre || ""} ${t.apellido || ""}`.toLowerCase()
    const mascotas = (t.pacientes || []).map((p: any) => p.nombre).join(" ").toLowerCase()
    return nombre.includes(q) || (t.telefono || "").includes(q) || mascotas.includes(q)
  })

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por tutor, teléfono o mascota…" style={{ ...inputStyle, maxWidth: 380, flex: 1 }} />
        <button onClick={abrirNuevo} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Nuevo tutor</button>
      </div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>{tutores.length === 0 ? "Todavía no hay tutores" : "Sin resultados"}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtrados.map(t => {
            const mascotas = (t.pacientes || []).map((p: any) => p.nombre)
            return (
              <div key={t.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5, color: "#1d1b12" }}>
                      {`${t.nombre || ""} ${t.apellido || ""}`.trim()}
                      {mascotas.length > 0 && (
                        <span style={{ fontWeight: 600, color: "#7c3aed", fontSize: 13 }}> 🐾 {mascotas.join(", ")}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {t.telefono && <span>📞 {t.telefono}</span>}
                      {t.email && <span>📧 {t.email}</span>}
                      {t.localidad && <span>📍 {t.localidad}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Link href={`/pacientes`} title="Ver pacientes" style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#6f7d49", textDecoration: "none" }}>🐾</Link>
                    <button onClick={() => abrirEditar(t)} title="Editar" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#475569" }}>✎</button>
                    <button onClick={() => setConfirmEliminar(t)} title="Eliminar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{editId ? "Editar tutor" : "Nuevo tutor"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Apellido</label>
                <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="Ej: Pérez" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Ej: 2604000000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input value={form.localidad} onChange={e => setForm({ ...form, localidad: e.target.value })} placeholder="Ej: Av. San Martín 1234" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Email <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(para recordatorios)</span></label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Ej: tutor@email.com" style={inputStyle} />
              </div>
            </div>

            {/* Primera mascota — solo al crear un tutor nuevo */}
            {!editId && (
              <div style={{ marginTop: 18, border: "1px solid #e6e8cf", background: "#faf9f1", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#4b5a2c", marginBottom: 4 }}>🐾 Primera mascota <span style={{ color: "#94a3b8", fontWeight: 500 }}>(opcional)</span></div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 12 }}>Si la cargás, se crea automáticamente en Pacientes ligada a este tutor.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nombre de la mascota</label>
                    <input value={form.pacNombre} onChange={e => setForm({ ...form, pacNombre: e.target.value })} placeholder="Ej: Firulais" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Especie</label>
                    <select value={form.pacEspecie} onChange={e => setForm({ ...form, pacEspecie: e.target.value })} style={inputStyle}>
                      {ESPECIES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Raza</label>
                    <input value={form.pacRaza} onChange={e => setForm({ ...form, pacRaza: e.target.value })} placeholder="Ej: Caniche" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sexo</label>
                    <select value={form.pacSexo} onChange={e => setForm({ ...form, pacSexo: e.target.value })} style={inputStyle}>
                      <option value="">—</option>
                      {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Nacimiento</label>
                    <input type="date" value={form.pacNac} onChange={e => setForm({ ...form, pacNac: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

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
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 6 }}>¿Eliminar a {`${confirmEliminar.nombre || ""} ${confirmEliminar.apellido || ""}`.trim()}?</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Sus mascotas quedarán sin tutor asignado.</p>
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
