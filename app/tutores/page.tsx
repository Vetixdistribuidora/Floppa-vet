"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { modulosActivos } from "@/lib/modulos"

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
const FORM_VACIO = { nombre: "", apellido: "", cuit: "", porcentaje: "", telefono: "", email: "", localidad: "", pacNombre: "", pacEspecie: "Perro", pacRaza: "", pacSexo: "", pacNac: "" }
// Módulos comerciales: si la org los tiene (mixto/personalizado), Tutores muestra
// también CUIT y % margen, funcionando como un Clientes completo.
const MODS_COM = ["proveedores", "compras", "cuentas", "reportes", "deudores", "cheques", "mermas", "pedidos", "tienda-online", "clientes"]

export default function TutoresPage() {
  const router = useRouter()
  const [tutores, setTutores] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [salaTutor, setSalaTutor] = useState<any>(null)
  const [salaForm, setSalaForm] = useState<any>({ paciente_id: "", motivo: "", prioridad: "normal" })
  const [salaGuardando, setSalaGuardando] = useState(false)
  const [addPacTutor, setAddPacTutor] = useState<any>(null)
  const [addPacForm, setAddPacForm] = useState<any>({ nombre: "", especie: "Perro", raza: "", sexo: "", nac: "" })
  const [addPacGuardando, setAddPacGuardando] = useState(false)
  const [comercial, setComercial] = useState(false)

  function abrirAddPac(t: any) { setAddPacTutor(t); setAddPacForm({ nombre: "", especie: "Perro", raza: "", sexo: "", nac: "" }) }
  async function guardarPaciente() {
    if (!addPacForm.nombre.trim()) { mostrar("Poné el nombre de la mascota", "error"); return }
    setAddPacGuardando(true)
    const { error } = await supabase.from("pacientes").insert([{
      cliente_id: addPacTutor.id,
      nombre: addPacForm.nombre.trim(),
      especie: addPacForm.especie || null,
      raza: addPacForm.raza.trim() || null,
      sexo: addPacForm.sexo || null,
      fecha_nacimiento: addPacForm.nac || null,
    }])
    setAddPacGuardando(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    setAddPacTutor(null); mostrar("Mascota agregada", "ok"); cargar()
  }

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  function abrirSala(t: any) {
    const pacs = t.pacientes || []
    setSalaTutor(t)
    setSalaForm({ paciente_id: pacs.length === 1 ? String(pacs[0].id) : "", motivo: "", prioridad: "normal" })
  }
  async function agregarASala() {
    if (!salaForm.paciente_id) { mostrar("Elegí la mascota que viene", "error"); return }
    setSalaGuardando(true)
    const { error } = await supabase.from("sala_espera").insert([{
      paciente_id: Number(salaForm.paciente_id),
      motivo: salaForm.motivo.trim() || null,
      prioridad: salaForm.prioridad,
    }])
    setSalaGuardando(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    setSalaTutor(null); mostrar("Agregado a la sala de espera", "ok")
  }

  async function cargar() {
    setCargando(true)
    const [{ data }, { data: org }] = await Promise.all([
      supabase.from("clientes").select("id, nombre, apellido, cuit, porcentaje, telefono, email, localidad, pacientes(id, nombre, especie)").order("nombre"),
      supabase.from("organizaciones").select("modulos").maybeSingle(),
    ])
    setTutores(data || [])
    setComercial(modulosActivos((org as any)?.modulos).some(m => MODS_COM.includes(m)))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  function abrirNuevo() { setEditId(null); setForm(FORM_VACIO); setModal(true) }
  function abrirEditar(t: any) {
    setEditId(t.id)
    setForm({ ...FORM_VACIO, nombre: t.nombre || "", apellido: t.apellido || "", cuit: t.cuit || "", porcentaje: t.porcentaje != null ? String(t.porcentaje) : "", telefono: t.telefono || "", email: t.email || "", localidad: t.localidad || "" })
    setModal(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { mostrar("El nombre es obligatorio", "error"); return }
    setGuardando(true)
    const payload = { nombre: form.nombre.trim(), apellido: form.apellido.trim(), cuit: form.cuit.trim() || null, porcentaje: Number(form.porcentaje || 0), telefono: form.telefono.trim(), email: form.email.trim() || null, localidad: form.localidad.trim() }
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.map(t => {
            const mascotas = (t.pacientes || []).map((p: any) => p.nombre)
            const nombreCompleto = `${t.nombre || ""} ${t.apellido || ""}`.trim()
            const inicial = (t.nombre || "?").charAt(0).toUpperCase()
            return (
              <div key={t.id} className="card-row" onClick={() => router.push(`/pacientes?tutor=${t.id}`)} title="Ver mascotas de este tutor"
                style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "box-shadow .15s, transform .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#eef0e0", color: "#4b5a2c", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{inicial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15.5, color: "#1d1b12" }}>{nombreCompleto || "Sin nombre"}</span>
                    {mascotas.length > 0 && (
                      <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {mascotas.map((m: string, i: number) => (
                          <span key={i} style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", color: "#6f7d49", fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>🐾 {m}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {t.telefono && <span>📞 {t.telefono}</span>}
                    {t.email && <span>📧 {t.email}</span>}
                    {t.localidad && <span>📍 {t.localidad}</span>}
                    {comercial && t.cuit && <span>🧾 {t.cuit}</span>}
                    {!t.telefono && !t.email && !t.localidad && <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>Sin datos de contacto</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
                    {mascotas.length} mascota{mascotas.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="card-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); abrirSala(t) }} title="Agregar a sala de espera" style={{ background: "#ccfbf1", border: "1px solid #99f6e4", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: "#0d9488", fontWeight: 700 }}>🪑</button>
                  <button onClick={e => { e.stopPropagation(); abrirAddPac(t) }} title="Agregar mascota" style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: "#6f7d49", fontWeight: 700 }}>🐾+</button>
                  <button onClick={e => { e.stopPropagation(); abrirEditar(t) }} title="Editar" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: "#475569" }}>✎</button>
                  <button onClick={e => { e.stopPropagation(); setConfirmEliminar(t) }} title="Eliminar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: "#dc2626" }}>🗑</button>
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
              {comercial && (
                <>
                  <div>
                    <label style={labelStyle}>CUIT <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(para facturar)</span></label>
                    <input value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })} placeholder="Ej: 20-12345678-3" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>% Margen <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(recargo en ventas)</span></label>
                    <input type="number" value={form.porcentaje} onChange={e => setForm({ ...form, porcentaje: e.target.value })} placeholder="0" style={inputStyle} />
                  </div>
                </>
              )}
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

      {/* Modal agregar mascota a un tutor */}
      {addPacTutor && (
        <div onClick={() => setAddPacTutor(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>🐾 Nueva mascota</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b" }}>Tutor: {`${addPacTutor.nombre || ""} ${addPacTutor.apellido || ""}`.trim()}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input value={addPacForm.nombre} onChange={e => setAddPacForm({ ...addPacForm, nombre: e.target.value })} placeholder="Ej: Firulais" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Especie</label>
                <select value={addPacForm.especie} onChange={e => setAddPacForm({ ...addPacForm, especie: e.target.value })} style={inputStyle}>
                  {ESPECIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Raza</label>
                <input value={addPacForm.raza} onChange={e => setAddPacForm({ ...addPacForm, raza: e.target.value })} placeholder="Ej: Caniche" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sexo</label>
                <select value={addPacForm.sexo} onChange={e => setAddPacForm({ ...addPacForm, sexo: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nacimiento</label>
                <input type="date" value={addPacForm.nac} onChange={e => setAddPacForm({ ...addPacForm, nac: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setAddPacTutor(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarPaciente} disabled={addPacGuardando} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: addPacGuardando ? "wait" : "pointer" }}>{addPacGuardando ? "Guardando…" : "Agregar mascota"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar a sala */}
      {salaTutor && (
        <div onClick={() => setSalaTutor(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 440 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>🪑 Agregar a la sala</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b" }}>Tutor: {`${salaTutor.nombre || ""} ${salaTutor.apellido || ""}`.trim()}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Mascota *</label>
                {(salaTutor.pacientes || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>Este tutor no tiene mascotas cargadas. Agregá una en Pacientes primero.</p>
                ) : (
                  <select value={salaForm.paciente_id} onChange={e => setSalaForm({ ...salaForm, paciente_id: e.target.value })} style={inputStyle}>
                    <option value="">— Elegir mascota —</option>
                    {(salaTutor.pacientes || []).map((p: any) => <option key={p.id} value={String(p.id)}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={labelStyle}>Motivo</label>
                <input value={salaForm.motivo} onChange={e => setSalaForm({ ...salaForm, motivo: e.target.value })} placeholder="Ej: Control, vacuna, vómitos…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Prioridad</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["normal", "Normal", "#0d9488"], ["urgente", "Urgente", "#dc2626"]].map(([v, lab, col]) => (
                    <button key={v} type="button" onClick={() => setSalaForm({ ...salaForm, prioridad: v })}
                      style={{ flex: 1, padding: "10px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13.5, border: salaForm.prioridad === v ? `2px solid ${col}` : "1px solid #e2e8f0", background: salaForm.prioridad === v ? `${col}15` : "white", color: salaForm.prioridad === v ? col : "#64748b" }}>
                      {lab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setSalaTutor(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={agregarASala} disabled={salaGuardando || (salaTutor.pacientes || []).length === 0} style={{ background: "#0d9488", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: salaGuardando ? "wait" : "pointer", opacity: (salaTutor.pacientes || []).length === 0 ? 0.5 : 1 }}>{salaGuardando ? "Agregando…" : "Agregar a sala"}</button>
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
