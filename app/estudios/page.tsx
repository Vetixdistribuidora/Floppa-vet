"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"

const OLIVA = "#6f7d49"
const TIPOS = ["Análisis de sangre", "Análisis de orina", "Ecografía", "Radiografía", "Informe", "Certificado", "Otro"]

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "ok" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 30, right: 30, background: tipo === "ok" ? "#2f9e44" : "#e03131", color: "white", padding: "12px 22px", borderRadius: 10, fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: 15 }}>
      {tipo === "ok" ? "✓ " : "✕ "}{mensaje}
    </div>
  )
}

function fmtTam(b: number | null) {
  if (!b) return ""
  if (b < 1024) return b + " B"
  if (b < 1048576) return (b / 1024).toFixed(0) + " KB"
  return (b / 1048576).toFixed(1) + " MB"
}
function fechaCorta(f: string) {
  return new Date(f).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}
function iconoTipo(t: string | null, nombre: string | null) {
  const n = (nombre || "").toLowerCase()
  if (n.endsWith(".pdf")) return "📄"
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return "🖼️"
  if ((t || "").toLowerCase().includes("radio")) return "🩻"
  if ((t || "").toLowerCase().includes("eco")) return "🔬"
  return "📎"
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box", background: "white" }

export default function EstudiosPage() {
  const [estudios, setEstudios] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [filtroPaciente, setFiltroPaciente] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ paciente_id: "", titulo: "", tipo: "Análisis de sangre" })
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3500) }

  async function cargar() {
    setCargando(true)
    const [{ data: est }, { data: pac }, { data: org }] = await Promise.all([
      supabase.from("estudios").select("*, pacientes(nombre, especie)").order("created_at", { ascending: false }),
      supabase.from("pacientes").select("id, nombre, especie").order("nombre"),
      supabase.from("organizaciones").select("id").maybeSingle(),
    ])
    setEstudios(est || [])
    setPacientes(pac || [])
    setOrgId((org as any)?.id ?? null)
    setCargando(false)
  }
  useEffect(() => {
    cargar()
    const pid = new URLSearchParams(window.location.search).get("paciente")
    if (pid) setFiltroPaciente(pid)
  }, [])

  function abrirNuevo() {
    setForm({ paciente_id: filtroPaciente || "", titulo: "", tipo: "Análisis de sangre" })
    setArchivo(null)
    if (fileRef.current) fileRef.current.value = ""
    setModal(true)
  }

  async function subir() {
    if (!form.paciente_id) { mostrar("Elegí el paciente", "error"); return }
    if (!archivo) { mostrar("Elegí un archivo", "error"); return }
    if (!orgId) { mostrar("No se pudo identificar la organización", "error"); return }
    if (archivo.size > 25 * 1024 * 1024) { mostrar("El archivo supera los 25 MB", "error"); return }
    setSubiendo(true)
    try {
      const safe = archivo.name.replace(/[^\w.\-]+/g, "_")
      const path = `${orgId}/${form.paciente_id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from("estudios").upload(path, archivo, { upsert: false })
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from("estudios").insert([{
        paciente_id: Number(form.paciente_id),
        titulo: form.titulo.trim() || archivo.name,
        tipo: form.tipo,
        archivo_path: path,
        archivo_nombre: archivo.name,
        tamano: archivo.size,
      }])
      if (insErr) { await supabase.storage.from("estudios").remove([path]); throw insErr }
      mostrar("Estudio subido", "ok")
      setModal(false); cargar()
    } catch (e: any) {
      mostrar("Error al subir: " + (e?.message || "desconocido"), "error")
    } finally { setSubiendo(false) }
  }

  async function descargar(e: any) {
    const { data, error } = await supabase.storage.from("estudios").createSignedUrl(e.archivo_path, 3600)
    if (error || !data?.signedUrl) { mostrar("No se pudo abrir el archivo", "error"); return }
    window.open(data.signedUrl, "_blank")
  }

  async function eliminar() {
    if (!confirmEliminar) return
    const e = confirmEliminar
    await supabase.storage.from("estudios").remove([e.archivo_path])
    const { error } = await supabase.from("estudios").delete().eq("id", e.id)
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Estudio eliminado", "ok"); setEstudios(prev => prev.filter(x => x.id !== e.id)) }
    setConfirmEliminar(null)
  }

  const filtrados = estudios.filter(e => {
    if (filtroPaciente && String(e.paciente_id) !== filtroPaciente) return false
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (e.titulo || "").toLowerCase().includes(q) || (e.tipo || "").toLowerCase().includes(q) || (e.pacientes?.nombre || "").toLowerCase().includes(q)
  })
  const pacienteFiltrado = pacientes.find(p => String(p.id) === filtroPaciente)

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por título, tipo o paciente…" style={{ ...inputStyle, maxWidth: 280, flex: 1 }} />
          <select value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 240 }}>
            <option value="">Todos los pacientes</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}</option>)}
          </select>
        </div>
        <button onClick={abrirNuevo} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Subir estudio</button>
      </div>

      {pacienteFiltrado && (
        <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13.5, color: "#155e75", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>📎 Estudios de <b>{pacienteFiltrado.nombre}</b> — {filtrados.length}</span>
          <button onClick={() => setFiltroPaciente("")} style={{ background: "transparent", border: "none", color: "#0891b2", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Ver todos ✕</button>
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>{estudios.length === 0 ? "Todavía no hay estudios cargados" : "Sin resultados"}</p>
          {estudios.length === 0 && <p style={{ fontSize: 13, marginTop: 4 }}>Subí análisis, ecografías, radiografías… con “+ Subir estudio”.</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtrados.map(e => (
            <div key={e.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ fontSize: 28, lineHeight: 1 }}>{iconoTipo(e.tipo, e.archivo_nombre)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12", wordBreak: "break-word" }}>{e.titulo}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {e.tipo}{e.pacientes ? ` · 🐾 ${e.pacientes.nombre}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>
                    {fechaCorta(e.created_at)}{e.tamano ? ` · ${fmtTam(e.tamano)}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => descargar(e)} style={{ flex: 1, background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 13, color: "#0891b2", fontWeight: 700 }}>⬇ Abrir</button>
                <button onClick={() => setConfirmEliminar(e)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontSize: 13, color: "#dc2626" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal subir */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>Subir estudio</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Paciente *</label>
                <ComboBox
                  options={pacientes.map(p => ({ value: String(p.id), label: `${p.nombre}${p.especie ? ` (${p.especie})` : ""}` }))}
                  value={form.paciente_id}
                  onChange={v => setForm({ ...form, paciente_id: v })}
                  placeholder="Buscar paciente…"
                />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Título</label>
                <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Opcional" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Archivo *</label>
                <input ref={fileRef} type="file" onChange={e => setArchivo(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.dcm"
                  style={{ ...inputStyle, padding: "8px 10px" }} />
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 5 }}>PDF, imágenes, documentos… hasta 25 MB.</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModal(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={subir} disabled={subiendo} style={{ background: OLIVA, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: subiendo ? "wait" : "pointer" }}>{subiendo ? "Subiendo…" : "Subir"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <div onClick={() => setConfirmEliminar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 6 }}>¿Eliminar “{confirmEliminar.titulo}”?</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Se borra el archivo definitivamente.</p>
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
