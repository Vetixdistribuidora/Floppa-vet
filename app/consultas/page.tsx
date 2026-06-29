"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"

const OLIVA = "var(--accent)"
const hoyISO = () => new Date().toISOString().split("T")[0]
const TIPOS_EST = ["Análisis de sangre", "Análisis de orina", "Ecografía", "Radiografía", "Citología", "Biopsia", "Cultivo", "Raspaje", "Informe", "Certificado", "Otro"]
const TIPOS_SAN = ["Vacuna Antirrábica", "Vacuna Quíntuple", "Vacuna Triple", "Vacuna Leucemia Felina", "Desparasitación Interna", "Desparasitación Externa", "Medicación", "Otro"]
function iconoEst(t: string | null, nombre: string | null) {
  const n = (nombre || "").toLowerCase(), tt = (t || "").toLowerCase()
  if (n.endsWith(".pdf")) return "📄"
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return "🖼️"
  if (tt.includes("radio")) return "🩻"
  if (tt.includes("eco")) return "🖼️"
  if (tt.includes("citolog") || tt.includes("biopsia") || tt.includes("cultivo") || tt.includes("raspaje")) return "🧫"
  if (tt.includes("análisis") || tt.includes("analisis")) return "🧪"
  return "📄"
}

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

// Tipos de consulta con su color, para distinguirlos en la historia clínica.
const TIPOS_CONSULTA = [
  { key: "consulta", label: "Consulta", color: "#4f46e5", bg: "#eef2ff" },
  { key: "control",  label: "Control",  color: "#0d9488", bg: "#ecfdf5" },
  { key: "cirugia",  label: "Cirugía",  color: "#9333ea", bg: "#faf5ff" },
  { key: "urgencia", label: "Urgencia", color: "#dc2626", bg: "#fef2f2" },
]
const tipoConsulta = (k?: string) => TIPOS_CONSULTA.find(t => t.key === k) || TIPOS_CONSULTA[0]

const formVacio = () => ({ paciente_id: "", fecha: hoyISO(), tipo: "consulta", motivo: "", diagnostico: "", tratamiento: "", peso: "", temperatura: "", notas: "", para_cobrar: "", cobrarItems: [] as any[] })
function resumenItems(items: any[]): string {
  return (items || []).filter(i => i.producto_id).map(i => `${i.cantidad > 1 ? i.cantidad + "x " : ""}${i.nombre}`).join(", ")
}

export default function ConsultasPage() {
  const [consultas, setConsultas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [filtroPaciente, setFiltroPaciente] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [filtroFecha, setFiltroFecha] = useState(hoyISO()) // por defecto, las consultas de hoy
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "consulta" | "estudio" | "sanidad" | "internacion">("todos")
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [estudios, setEstudios] = useState<any[]>([])
  const [sanidad, setSanidad] = useState<any[]>([])
  const [internaciones, setInternaciones] = useState<any[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [productosCat, setProductosCat] = useState<any[]>([])
  const [modalEst, setModalEst] = useState(false)
  const [formEst, setFormEst] = useState<any>({ paciente_id: "", titulo: "", tipo: "Ecografía" })
  const [archivoEst, setArchivoEst] = useState<File | null>(null)
  const [subiendoEst, setSubiendoEst] = useState(false)
  const fileEstRef = useRef<HTMLInputElement>(null)
  const [modalSan, setModalSan] = useState(false)
  const [formSan, setFormSan] = useState<any>({ paciente_id: "", tipo: "Vacuna Antirrábica", fecha_aplicacion: hoyISO(), fecha: "", notas: "" })
  const [guardandoSan, setGuardandoSan] = useState(false)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const [{ data: con }, { data: pac }, { data: est }, { data: san }, { data: org }, { data: inter }] = await Promise.all([
      supabase.from("consultas").select("*, pacientes(nombre, especie, cliente_id, clientes(nombre, apellido))").order("fecha", { ascending: false }),
      supabase.from("pacientes").select("id, nombre, especie, clientes(nombre, apellido)").order("nombre"),
      supabase.from("estudios").select("*, pacientes(nombre, especie)").order("created_at", { ascending: false }),
      supabase.from("recordatorios").select("*, pacientes(nombre, especie)").order("fecha", { ascending: false }),
      supabase.from("organizaciones").select("id").maybeSingle(),
      supabase.from("internaciones").select("*, pacientes(nombre, especie)").order("fecha_ingreso", { ascending: false }),
    ])
    setConsultas(con || [])
    setPacientes(pac || [])
    setEstudios(est || [])
    setSanidad(san || [])
    setInternaciones(inter || [])
    setOrgId((org as any)?.id ?? null)
    const { data: prods } = await supabase.from("productos").select("id, nombre, precio_venta, es_servicio").order("nombre")
    setProductosCat(prods || [])
    setCargando(false)
  }
  useEffect(() => {
    cargar()
    // Pre-filtrar por paciente si viene en la URL (?paciente=ID) desde la ficha.
    // Con ?nueva=consulta|estudio|sanidad se abre directo el alta de ese tipo.
    const params = new URLSearchParams(window.location.search)
    const pid = params.get("paciente")
    if (pid) { setFiltroPaciente(pid); setFiltroFecha("") }
    const nueva = params.get("nueva")
    if (nueva) {
      setTimeout(() => {
        if (nueva === "estudio") { setFormEst({ paciente_id: pid || "", titulo: "", tipo: "Ecografía" }); setModalEst(true) }
        else if (nueva === "sanidad") { setFormSan({ paciente_id: pid || "", tipo: "Vacuna Antirrábica", fecha_aplicacion: hoyISO(), fecha: "", notas: "" }); setModalSan(true) }
        else { setEditId(null); setForm({ ...formVacio(), paciente_id: pid || "" }); setModal(true) }
      }, 0)
    }
  }, [])

  function abrirNueva() {
    setEditId(null)
    setForm({ ...formVacio(), paciente_id: filtroPaciente || "" })
    setModal(true)
  }
  function abrirEditar(c: any) {
    setEditId(c.id)
    setForm({
      paciente_id: String(c.paciente_id), fecha: c.fecha || hoyISO(), tipo: c.tipo || "consulta",
      motivo: c.motivo || "", diagnostico: c.diagnostico || "", tratamiento: c.tratamiento || "",
      peso: c.peso ?? "", temperatura: c.temperatura ?? "", notas: c.notas || "", para_cobrar: c.para_cobrar || "",
      cobrarItems: Array.isArray(c.cobrar_items) ? c.cobrar_items : [],
    })
    setModal(true)
  }

  function agregarCobrarItem(pid: string) {
    const p = productosCat.find(x => String(x.id) === pid)
    if (!p) return
    setForm((f: any) => {
      const ex = f.cobrarItems.find((i: any) => i.producto_id === p.id)
      const items = ex
        ? f.cobrarItems.map((i: any) => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...f.cobrarItems, { producto_id: p.id, nombre: p.nombre, precio: p.precio_venta, cantidad: 1 }]
      return { ...f, cobrarItems: items, para_cobrar: resumenItems(items) }
    })
  }
  function setCobrarCant(pid: number, cant: number) {
    setForm((f: any) => { const items = f.cobrarItems.map((i: any) => i.producto_id === pid ? { ...i, cantidad: Math.max(1, cant) } : i); return { ...f, cobrarItems: items, para_cobrar: resumenItems(items) } })
  }
  function quitarCobrarItem(pid: number) {
    setForm((f: any) => { const items = f.cobrarItems.filter((i: any) => i.producto_id !== pid); return { ...f, cobrarItems: items, para_cobrar: resumenItems(items) } })
  }

  async function guardar() {
    if (!form.paciente_id) { mostrar("Elegí el paciente", "error"); return }
    setGuardando(true)
    const items = form.cobrarItems || []
    const payload = {
      paciente_id: Number(form.paciente_id), fecha: form.fecha || hoyISO(), tipo: form.tipo || "consulta",
      motivo: form.motivo.trim() || null, diagnostico: form.diagnostico.trim() || null,
      tratamiento: form.tratamiento.trim() || null,
      peso: form.peso === "" ? null : Number(form.peso),
      temperatura: form.temperatura === "" ? null : Number(form.temperatura),
      notas: form.notas.trim() || null,
      para_cobrar: (items.length ? resumenItems(items) : form.para_cobrar.trim()) || null,
      cobrar_items: items.length ? items : null,
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
      // Mantener el peso del paciente actualizado con el de su consulta más reciente.
      const pid = Number(form.paciente_id)
      const { data: ult } = await supabase.from("consultas")
        .select("peso").eq("paciente_id", pid).not("peso", "is", null)
        .order("fecha", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle()
      if (ult?.peso != null) await supabase.from("pacientes").update({ peso: ult.peso }).eq("id", pid)
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

  function abrirEstudioModal() { setFormEst({ paciente_id: filtroPaciente || "", titulo: "", tipo: "Ecografía" }); setArchivoEst(null); if (fileEstRef.current) fileEstRef.current.value = ""; setModalEst(true) }
  function abrirSanidadModal() { setFormSan({ paciente_id: filtroPaciente || "", tipo: "Vacuna Antirrábica", fecha_aplicacion: hoyISO(), fecha: "", notas: "" }); setModalSan(true) }

  async function descargarEstudio(e: any) {
    const win = window.open("", "_blank")
    const { data, error } = await supabase.storage.from("estudios").createSignedUrl(e.archivo_path, 3600)
    if (error || !data?.signedUrl) { if (win) win.close(); mostrar("No se pudo abrir el archivo", "error"); return }
    if (win) win.location.href = data.signedUrl; else window.open(data.signedUrl, "_blank")
  }

  async function subirEstudio() {
    if (!formEst.paciente_id) { mostrar("Elegí el paciente", "error"); return }
    if (!archivoEst) { mostrar("Elegí un archivo", "error"); return }
    if (!orgId) { mostrar("No se pudo identificar la organización", "error"); return }
    if (archivoEst.size > 25 * 1024 * 1024) { mostrar("El archivo supera los 25 MB", "error"); return }
    setSubiendoEst(true)
    try {
      const safe = archivoEst.name.replace(/[^\w.\-]+/g, "_")
      const path = `${orgId}/${formEst.paciente_id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from("estudios").upload(path, archivoEst, { upsert: false })
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from("estudios").insert([{ paciente_id: Number(formEst.paciente_id), titulo: formEst.titulo.trim() || archivoEst.name, tipo: formEst.tipo, archivo_path: path, archivo_nombre: archivoEst.name, tamano: archivoEst.size }])
      if (insErr) { await supabase.storage.from("estudios").remove([path]); throw insErr }
      mostrar("Estudio agregado", "ok"); setModalEst(false); cargar()
    } catch (e: any) { mostrar("Error al subir: " + (e?.message || "desconocido"), "error") } finally { setSubiendoEst(false) }
  }

  async function guardarSanidad() {
    if (!formSan.paciente_id) { mostrar("Elegí el paciente", "error"); return }
    setGuardandoSan(true)
    const payload = { paciente_id: Number(formSan.paciente_id), tipo: formSan.tipo || null, fecha_aplicacion: formSan.fecha_aplicacion || null, fecha: formSan.fecha || formSan.fecha_aplicacion || hoyISO(), notas: formSan.notas.trim() || null }
    const { error } = await supabase.from("recordatorios").insert([payload])
    setGuardandoSan(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    mostrar("Registro de sanidad agregado", "ok"); setModalSan(false); cargar()
  }

  // Lista unificada: consultas + estudios + sanidad
  const coincideBusq = (txt: string) => !busqueda.trim() || txt.toLowerCase().includes(busqueda.toLowerCase())
  const eventos = [
    ...consultas.map(c => ({ kind: "consulta", id: "c" + c.id, fecha: c.fecha, paciente_id: c.paciente_id, data: c })),
    ...estudios.map(e => ({ kind: "estudio", id: "e" + e.id, fecha: (e.created_at || "").slice(0, 10), paciente_id: e.paciente_id, data: e })),
    ...sanidad.map(s => ({ kind: "sanidad", id: "s" + s.id, fecha: s.fecha_aplicacion || s.fecha, paciente_id: s.paciente_id, data: s })),
    ...internaciones.map(i => ({ kind: "internacion", id: "i" + i.id, fecha: (i.fecha_ingreso || "").slice(0, 10), paciente_id: i.paciente_id, data: i })),
  ].filter(ev => {
    // Si hay un paciente elegido, mostramos TODO su historial (ignora la fecha)
    if (filtroFecha && !filtroPaciente && ev.fecha !== filtroFecha) return false
    if (filtroPaciente && String(ev.paciente_id) !== filtroPaciente) return false
    if (filtroTipo !== "todos" && ev.kind !== filtroTipo) return false
    const pac = ev.data.pacientes
    const nombrePac = pac?.nombre || ""
    const tutor = pac?.clientes ? `${pac.clientes.nombre || ""} ${pac.clientes.apellido || ""}` : ""
    const extra = ev.kind === "consulta" || ev.kind === "internacion" ? (ev.data.motivo || "") : ev.kind === "estudio" ? (ev.data.titulo || "") + (ev.data.tipo || "") : (ev.data.tipo || "")
    return coincideBusq(nombrePac) || coincideBusq(tutor) || coincideBusq(extra)
  }).sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))

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
            style={{ background: filtroFecha ? "#f1f5f9" : "var(--accent)", color: filtroFecha ? "#475569" : "white", border: filtroFecha ? "1px solid #e2e8f0" : "none", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {filtroFecha ? "Ver todas" : "Hoy"}
          </button>
        </div>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por tutor, paciente o motivo…" style={{ ...inputStyle, maxWidth: 260, flex: 1 }} />
        <select value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 240, flex: 1 }}>
          <option value="">Todos los pacientes</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}{p.clientes ? ` — ${`${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim()}` : ""}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={abrirSanidadModal} style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Sanidad</button>
          <button onClick={abrirEstudioModal} style={{ background: "#ecfeff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Estudio</button>
          <button onClick={abrirNueva} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Consulta</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {([["todos", "Todos"], ["consulta", "📋 Consultas"], ["estudio", "📎 Estudios"], ["sanidad", "💉 Sanidad"], ["internacion", "🏥 Internación"]] as const).map(([k, lab]) => (
          <button key={k} onClick={() => setFiltroTipo(k)} style={{ border: `1px solid ${filtroTipo === k ? "var(--accent)" : "#e2e8f0"}`, background: filtroTipo === k ? "#eef0e0" : "white", color: filtroTipo === k ? "var(--accent-dark)" : "#64748b", borderRadius: 8, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{lab}</button>
        ))}
      </div>

      {pacienteFiltrado && (
        <div style={{ background: "#f4f2e6", border: "1px solid #e6e8cf", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13.5, color: "var(--accent-dark)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>📋 Historia clínica de <b>{pacienteFiltrado.nombre}</b> — {eventos.length} registro(s) (historial completo)</span>
          <button onClick={() => setFiltroPaciente("")} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Ver todas ✕</button>
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : eventos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 600, color: "#475569" }}>Sin registros para este filtro</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {eventos.map(ev => {
            // ── Estudio ──
            if (ev.kind === "estudio") {
              const e = ev.data
              return (
                <div key={ev.id} style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: "4px solid #0891b2", borderRadius: 14, padding: "13px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26 }}>{iconoEst(e.tipo, e.archivo_nombre)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12" }}>📎 {e.titulo} <span style={{ fontWeight: 500, color: "#0891b2", fontSize: 12.5 }}>· {e.tipo}</span></div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{e.pacientes?.nombre || "Paciente"} · 🗓 {fechaCorta(ev.fecha)}</div>
                  </div>
                  <button onClick={() => descargarEstudio(e)} style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontSize: 13, color: "#0891b2", fontWeight: 700, flexShrink: 0 }}>⬇ Abrir</button>
                </div>
              )
            }
            // ── Sanidad ──
            if (ev.kind === "sanidad") {
              const s = ev.data
              return (
                <div key={ev.id} style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b", borderRadius: 14, padding: "13px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26 }}>💉</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12" }}>{s.tipo || "Sanidad"}</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      {s.pacientes?.nombre || "Paciente"} · 🗓 {fechaCorta(ev.fecha)}{s.fecha ? ` · próxima ${fechaCorta(s.fecha)}` : ""}{s.notas ? ` · ${s.notas}` : ""}
                    </div>
                  </div>
                  <Link href="/recordatorios" style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, color: "#c2410c", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Sanidad →</Link>
                </div>
              )
            }
            // ── Internación ──
            if (ev.kind === "internacion") {
              const it = ev.data
              const internado = it.estado === "internado"
              return (
                <div key={ev.id} style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: "4px solid #fb7185", borderRadius: 14, padding: "13px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26 }}>🏥</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12" }}>
                      Internación{it.motivo ? ` · ${it.motivo}` : ""}{it.jaula ? <span style={{ color: "#0d9488", fontWeight: 800 }}> · Jaula {it.jaula}</span> : null}
                      {internado && <span style={{ marginLeft: 8, background: "#fef2f2", color: "#e11d48", fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>internado</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      🗓 Ingreso {fechaCorta(ev.fecha)}{it.fecha_egreso ? ` · Alta ${fechaCorta((it.fecha_egreso || "").slice(0, 10))}` : ""}
                    </div>
                  </div>
                  <Link href="/internacion" style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, color: "#e11d48", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Abrir →</Link>
                </div>
              )
            }
            // ── Consulta ──
            const c = ev.data
            const pac = c.pacientes
            const tc = tipoConsulta(c.tipo)
            const dueño = pac?.clientes ? `${pac.clientes.nombre || ""} ${pac.clientes.apellido || ""}`.trim() : ""
            return (
              <div key={ev.id} style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: `4px solid ${tc.color}`, borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1d1b12", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ background: tc.bg, color: tc.color, fontSize: 10.5, fontWeight: 800, padding: "2px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.3 }}>{tc.label}</span>
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
                          <Link href={`/ventas?cliente=${c.pacientes.cliente_id}&consulta=${c.id}&cobrar=${encodeURIComponent(c.para_cobrar)}`}
                            title="Cobrar en Ventas (abre con el tutor cargado)"
                            style={{ background: "#1d1b12", color: "white", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>Cobrar →</Link>
                        )}
                        <button onClick={() => marcarCobrado(c, !c.cobrado)} style={{ background: c.cobrado ? "#f1f5f9" : "#16a34a", color: c.cobrado ? "#64748b" : "white", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{c.cobrado ? "Reabrir" : "Cobrado"}</button>
                      </div>
                    </div>
                  )}
                  {c.motivo && <div style={{ whiteSpace: "pre-wrap" }}><b style={{ color: "var(--accent-dark)", fontWeight: 800 }}>Motivo:</b> {c.motivo}</div>}
                  {c.diagnostico && <div style={{ whiteSpace: "pre-wrap" }}><b style={{ color: "var(--accent-dark)", fontWeight: 800 }}>Diagnóstico:</b> {c.diagnostico}</div>}
                  {c.tratamiento && <div style={{ whiteSpace: "pre-wrap" }}><b style={{ color: "var(--accent-dark)", fontWeight: 800 }}>Tratamiento:</b> {c.tratamiento}</div>}
                  {(c.peso != null || c.temperatura != null) && (
                    <div style={{ display: "flex", gap: 16, color: "#475569" }}>
                      {c.peso != null && <span><b style={{ color: "var(--accent-dark)", fontWeight: 800 }}>Peso:</b> {c.peso} kg</span>}
                      {c.temperatura != null && <span><b style={{ color: "var(--accent-dark)", fontWeight: 800 }}>Temp:</b> {c.temperatura}°</span>}
                    </div>
                  )}
                  {c.notas && (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginTop: 2 }}>
                      <b style={{ color: "var(--accent-dark)", fontWeight: 800 }}>Notas:</b>{" "}
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
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}{p.clientes ? ` — ${`${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim()}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TIPOS_CONSULTA.map(t => {
                    const sel = (form.tipo || "consulta") === t.key
                    return (
                      <button key={t.key} type="button" onClick={() => setForm({ ...form, tipo: t.key })}
                        style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                          border: `1.5px solid ${sel ? t.color : "#e2e8f0"}`, background: sel ? t.bg : "white", color: sel ? t.color : "#64748b" }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
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
              <div style={{ gridColumn: "1 / -1", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
                <label style={{ ...labelStyle, color: "#b45309" }}>💲 Para cobrar (recepción lo pasa a la venta sin tipear)</label>
                <div style={{ marginTop: 4 }}>
                  <ComboBox
                    options={productosCat.map(p => ({ value: String(p.id), label: `${p.nombre}${p.es_servicio ? " (servicio)" : ""} — $${Math.round(p.precio_venta).toLocaleString("es-AR")}` }))}
                    value=""
                    onChange={(v) => { if (v) agregarCobrarItem(v) }}
                    allowEmpty={false}
                    placeholder="Buscar o elegir producto / servicio…"
                  />
                </div>
                {form.cobrarItems.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {form.cobrarItems.map((it: any) => (
                      <div key={it.producto_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, background: "white", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 10px" }}>
                        <span style={{ flex: 1, minWidth: 0, color: "#1d1b12", fontWeight: 600 }}>{it.nombre}</span>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>${Math.round(it.precio).toLocaleString("es-AR")}</span>
                        <input type="number" min={1} value={it.cantidad} onChange={e => setCobrarCant(it.producto_id, Number(e.target.value))} style={{ width: 56, padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, textAlign: "center" }} />
                        <button type="button" onClick={() => quitarCobrarItem(it.producto_id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 8 }}>Elegí los productos/servicios usados. Recepción los cobra con un clic, sin tipear.</div>
                )}
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

      {/* Modal subir estudio */}
      {modalEst && (
        <div onClick={() => setModalEst(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>📎 Agregar estudio</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Paciente *</label>
                <select value={formEst.paciente_id} onChange={e => setFormEst({ ...formEst, paciente_id: e.target.value })} style={inputStyle}>
                  <option value="">— Elegir —</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}{p.clientes ? ` — ${`${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim()}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={formEst.tipo} onChange={e => setFormEst({ ...formEst, tipo: e.target.value })} style={inputStyle}>
                  {TIPOS_EST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Título</label>
                <input value={formEst.titulo} onChange={e => setFormEst({ ...formEst, titulo: e.target.value })} placeholder="Opcional" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Archivo *</label>
                <input ref={fileEstRef} type="file" onChange={e => setArchivoEst(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.dcm" style={{ ...inputStyle, padding: "8px 10px" }} />
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 5 }}>PDF, imágenes, documentos… hasta 25 MB.</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalEst(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={subirEstudio} disabled={subiendoEst} style={{ background: "#0891b2", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: subiendoEst ? "wait" : "pointer" }}>{subiendoEst ? "Subiendo…" : "Agregar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sanidad */}
      {modalSan && (
        <div onClick={() => setModalSan(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>💉 Agregar a sanidad</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Paciente *</label>
                <select value={formSan.paciente_id} onChange={e => setFormSan({ ...formSan, paciente_id: e.target.value })} style={inputStyle}>
                  <option value="">— Elegir —</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}{p.clientes ? ` — ${`${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim()}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={formSan.tipo} onChange={e => setFormSan({ ...formSan, tipo: e.target.value })} style={inputStyle}>
                  {TIPOS_SAN.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha aplicada</label>
                <input type="date" value={formSan.fecha_aplicacion} onChange={e => setFormSan({ ...formSan, fecha_aplicacion: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Próxima dosis / recordatorio</label>
                <input type="date" value={formSan.fecha} onChange={e => setFormSan({ ...formSan, fecha: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notas</label>
                <input value={formSan.notas} onChange={e => setFormSan({ ...formSan, notas: e.target.value })} placeholder="Opcional" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalSan(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarSanidad} disabled={guardandoSan} style={{ background: "#f59e0b", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardandoSan ? "wait" : "pointer" }}>{guardandoSan ? "Guardando…" : "Agregar"}</button>
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
