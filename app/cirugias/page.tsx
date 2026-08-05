"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import ComboBox from "@/components/ComboBox"
import { useRol } from "@/lib/useRol"

const MORADO = "#9333ea"
const ESTADOS: Record<string, { label: string; bg: string; color: string; bd: string }> = {
  programada: { label: "Programada", bg: "#faf5ff", color: "#7e22ce", bd: "#e9d5ff" },
  realizada:  { label: "Realizada",  bg: "#dcfce7", color: "#15803d", bd: "#86efac" },
  cancelada:  { label: "Cancelada",  bg: "#f1f5f9", color: "#64748b", bd: "#e2e8f0" },
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

function fechaLarga(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })
}
function fechaCorta(iso: string | null) {
  return iso ? new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—"
}
function isoLocal(d: Date) { return d.toLocaleDateString("sv-SE") }
function mesNombre(d: Date) { return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) }
function celdasMes(ancla: Date): (Date | null)[] {
  const y = ancla.getFullYear(), m = ancla.getMonth()
  const off = (new Date(y, m, 1).getDay() + 6) % 7  // lunes = 0
  const total = new Date(y, m + 1, 0).getDate()
  const celdas: (Date | null)[] = []
  for (let i = 0; i < off; i++) celdas.push(null)
  for (let d = 1; d <= total; d++) celdas.push(new Date(y, m, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}
const DIAS_SEM = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const externoVacio = {
  externo: false, paciente_libre: "", especie: "", raza: "", edad: "", sexo: "",
  propietario_nombre: "", propietario_apellido: "", propietario_telefono: "", monto: "",
}
const cirugiaVacia = () => ({
  id: null as number | null, paciente_id: "", turno_id: null as number | null,
  fecha: hoyISO(), estado: "realizada", cirujano: "", ayudante: "", anestesia: "",
  procedimiento: "", diagnostico: "", hallazgos: "", complicaciones: "", indicaciones: "", notas: "",
  ...externoVacio,
})
const turnoVacio = () => ({ paciente_id: "", hora: "09:00", cirujano: "", notas: "", ...externoVacio })

function fmtMonto(n: any) { const v = Number(n); return isNaN(v) || v === 0 ? "" : "$" + v.toLocaleString("es-AR") }

// Campos externos + monto para el payload (a la base). Si no es externo, deja los
// datos de mascota/propietario en null pero conserva el monto (aplica a ambos casos).
function camposExternoPayload(f: any) {
  const monto = f.monto !== "" && !isNaN(Number(f.monto)) ? Number(f.monto) : null
  if (!f.externo) return {
    paciente_libre: null, especie: null, raza: null, edad: null, sexo: null,
    propietario_nombre: null, propietario_apellido: null, propietario_telefono: null, monto,
  }
  return {
    paciente_libre: f.paciente_libre.trim() || null, especie: f.especie.trim() || null,
    raza: f.raza.trim() || null, edad: f.edad.trim() || null, sexo: f.sexo || null,
    propietario_nombre: f.propietario_nombre.trim() || null, propietario_apellido: f.propietario_apellido.trim() || null,
    propietario_telefono: f.propietario_telefono.trim() || null, monto,
  }
}

// Selector de cirujano por chips + texto libre (mismo criterio que el veterinario en Sala).
// Definido a nivel de módulo (no dentro del componente) para que el input no pierda
// el foco al escribir: si fuera anidado, React lo re-montaría en cada render.
function SelectorCirujano({ vets, value, onChange }: { vets: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      {vets.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {vets.map(p => (
            <button key={p} type="button" onClick={() => onChange(value === p ? "" : p)}
              style={{ padding: "6px 11px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                border: value === p ? `2px solid ${MORADO}` : "1px solid #e2e8f0",
                background: value === p ? `${MORADO}15` : "white", color: value === p ? MORADO : "#334155" }}>
              {p}
            </button>
          ))}
        </div>
      )}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Nombre del cirujano" style={inputStyle} />
    </div>
  )
}

// Toggle Registrado / Externo (a nivel de módulo para no perder foco al re-render).
function ToggleExterno({ externo, onChange }: { externo: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[[false, "Paciente registrado"], [true, "Paciente externo (no vuelve)"]].map(([v, lab]) => (
        <button key={String(v)} type="button" onClick={() => onChange(v as boolean)}
          style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
            border: externo === v ? `2px solid ${MORADO}` : "1px solid #e2e8f0",
            background: externo === v ? `${MORADO}15` : "white", color: externo === v ? MORADO : "#64748b" }}>
          {lab as string}
        </button>
      ))}
    </div>
  )
}

// Campos de mascota + propietario para pacientes no registrados. `upd` mergea el patch.
function CamposExterno({ f, upd }: { f: any; upd: (patch: any) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: 14 }}>
      <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 800, color: "#7e22ce", textTransform: "uppercase", letterSpacing: 0.4 }}>Mascota</div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Nombre de la mascota *</label>
        <input value={f.paciente_libre} onChange={e => upd({ paciente_libre: e.target.value })} placeholder="Ej: Rocky" style={inputStyle} />
      </div>
      <div><label style={labelStyle}>Especie</label><input value={f.especie} onChange={e => upd({ especie: e.target.value })} placeholder="Perro, gato…" style={inputStyle} /></div>
      <div><label style={labelStyle}>Raza</label><input value={f.raza} onChange={e => upd({ raza: e.target.value })} style={inputStyle} /></div>
      <div><label style={labelStyle}>Edad</label><input value={f.edad} onChange={e => upd({ edad: e.target.value })} placeholder="Ej: 3 años" style={inputStyle} /></div>
      <div>
        <label style={labelStyle}>Sexo</label>
        <select value={f.sexo} onChange={e => upd({ sexo: e.target.value })} style={inputStyle}>
          <option value="">—</option><option value="Macho">Macho</option><option value="Hembra">Hembra</option>
        </select>
      </div>
      <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 800, color: "#7e22ce", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>Propietario</div>
      <div><label style={labelStyle}>Nombre</label><input value={f.propietario_nombre} onChange={e => upd({ propietario_nombre: e.target.value })} style={inputStyle} /></div>
      <div><label style={labelStyle}>Apellido</label><input value={f.propietario_apellido} onChange={e => upd({ propietario_apellido: e.target.value })} style={inputStyle} /></div>
      <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Teléfono</label><input value={f.propietario_telefono} onChange={e => upd({ propietario_telefono: e.target.value })} placeholder="Para contactarlo" style={inputStyle} /></div>
    </div>
  )
}

export default function CirugiasPage() {
  const { esAdmin } = useRol()
  const [fecha, setFecha] = useState(hoyISO())
  const [mesAncla, setMesAncla] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [turnos, setTurnos] = useState<any[]>([])       // turnos tipo Cirugía del mes visible
  const [cirugias, setCirugias] = useState<any[]>([])   // registros quirúrgicos recientes
  const [pacientes, setPacientes] = useState<any[]>([])
  const [vets, setVets] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [filtroPaciente, setFiltroPaciente] = useState("")

  // Precios del mes (nomenclador) — imágenes/PDF por organización
  const [orgId, setOrgId] = useState<string | null>(null)
  const [modalPrecios, setModalPrecios] = useState(false)
  const [precios, setPrecios] = useState<any[]>([])
  const [cargandoPrecios, setCargandoPrecios] = useState(false)
  const [subiendoPrecio, setSubiendoPrecio] = useState(false)
  const [arrastrandoPrecio, setArrastrandoPrecio] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [confirmBorrarPrecio, setConfirmBorrarPrecio] = useState<any>(null)
  const preciosFileRef = useRef<HTMLInputElement>(null)

  const [modalTurno, setModalTurno] = useState(false)
  const [formTurno, setFormTurno] = useState<any>(turnoVacio())
  const [modalCirugia, setModalCirugia] = useState(false)
  const [formCirugia, setFormCirugia] = useState<any>(cirugiaVacia())
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  function mostrar(m: string, t: "ok" | "error") { setToast({ mensaje: m, tipo: t }); setTimeout(() => setToast(null), 3000) }

  async function cargar() {
    setCargando(true)
    const y = mesAncla.getFullYear(), m = mesAncla.getMonth()
    const desde = isoLocal(new Date(y, m, 1)), hasta = isoLocal(new Date(y, m + 1, 0))
    const [{ data: tt }, { data: cir }, { data: pac }, { data: vetsTurnos }, { data: org }] = await Promise.all([
      supabase.from("turnos").select("*, pacientes(nombre, especie), clientes(nombre, apellido, telefono)")
        .eq("tipo", "Cirugía").gte("fecha", desde).lte("fecha", hasta).order("hora", { ascending: true }),
      supabase.from("cirugias").select("*, pacientes(nombre, especie), clientes(nombre, apellido, telefono)")
        .order("fecha", { ascending: false }).limit(300),
      supabase.from("pacientes").select("id, nombre, especie, raza, cliente_id, clientes(id, nombre, apellido, telefono)").eq("fallecido", false).order("nombre"),
      supabase.from("turnos").select("profesional").not("profesional", "is", null).limit(500),
      supabase.from("organizaciones").select("id").maybeSingle(),
    ])
    setTurnos(tt || []); setCirugias(cir || []); setPacientes(pac || []); setOrgId((org as any)?.id ?? null)
    const nombres = new Set<string>()
    ;(vetsTurnos || []).forEach((t: any) => { if (t.profesional) nombres.add(String(t.profesional).trim()) })
    ;(cir || []).forEach((c: any) => { if (c.cirujano) nombres.add(String(c.cirujano).trim()) })
    setVets([...nombres].filter(Boolean).sort())
    setCargando(false)
  }
  useEffect(() => { cargar() }, [mesAncla])
  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get("paciente")
    if (pid) setFiltroPaciente(pid)
  }, [])

  function moverMes(delta: number) { setMesAncla(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)) }

  // ---- Precios del mes (nomenclador) ----
  function abrirPrecios() { setModalPrecios(true); cargarPrecios() }
  async function cargarPrecios() {
    if (!orgId) return
    setCargandoPrecios(true)
    const { data: files } = await supabase.storage.from("precios").list(orgId, { limit: 100, sortBy: { column: "created_at", order: "desc" } })
    const items = (files || []).filter((f: any) => f.name && f.id) // descarta placeholders de carpeta
    const paths = items.map((f: any) => `${orgId}/${f.name}`)
    const urlByPath = new Map<string, string>()
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("precios").createSignedUrls(paths, 3600)
      ;(signed || []).forEach((s: any, i: number) => { if (s?.signedUrl) urlByPath.set(paths[i], s.signedUrl) })
    }
    setPrecios(items.map((f: any) => {
      const path = `${orgId}/${f.name}`
      const mime = f.metadata?.mimetype || ""
      return { name: f.name, path, url: urlByPath.get(path), isPdf: /pdf/i.test(mime) || /\.pdf$/i.test(f.name), size: f.metadata?.size, created: f.created_at }
    }))
    setCargandoPrecios(false)
  }
  function tomarPrecio(f?: File | null) {
    if (!f) return
    if (f.size > 25 * 1024 * 1024) { mostrar("El archivo supera los 25 MB", "error"); return }
    subirPrecio(f)
  }
  async function subirPrecio(file: File) {
    if (!orgId) { mostrar("No se pudo identificar la organización", "error"); return }
    setSubiendoPrecio(true)
    const safe = file.name.replace(/[^\w.\-]+/g, "_")
    const path = `${orgId}/${Date.now()}_${safe}`
    const { error } = await supabase.storage.from("precios").upload(path, file, { upsert: false })
    setSubiendoPrecio(false)
    if (preciosFileRef.current) preciosFileRef.current.value = ""
    if (error) { mostrar("Error al subir: " + error.message, "error"); return }
    mostrar("Agregado a Precios del mes", "ok"); cargarPrecios()
  }
  async function eliminarPrecio() {
    if (!confirmBorrarPrecio) return
    const { error } = await supabase.storage.from("precios").remove([confirmBorrarPrecio.path])
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Eliminado", "ok"); setPrecios(prev => prev.filter(x => x.path !== confirmBorrarPrecio.path)) }
    setConfirmBorrarPrecio(null)
  }

  // Opciones de paciente con tutor/teléfono para el buscador (mismo estilo que Sala).
  const opcionesPaciente = pacientes.map(p => {
    const cli = (p as any).clientes
    const tutor = cli ? `${cli.nombre || ""} ${cli.apellido || ""}`.trim() : ""
    const detalle = [p.especie, (p as any).raza].filter(Boolean).join(" · ")
    const sub = [tutor ? `Tutor: ${tutor}` : "Sin tutor asignado", cli?.telefono ? `Tel ${cli.telefono}` : "", detalle].filter(Boolean).join("  ·  ")
    return { value: String(p.id), label: p.nombre, sub, keywords: `${tutor} ${cli?.telefono || ""} ${detalle}` }
  })

  // Mapa turno_id -> cirugía registrada (para saber si un turno ya tiene registro).
  const cirugiaPorTurno = new Map<number, any>()
  cirugias.forEach(c => { if (c.turno_id != null) cirugiaPorTurno.set(Number(c.turno_id), c) })

  const turnosPorDia = turnos.reduce((acc: Record<string, number>, t: any) => { acc[t.fecha] = (acc[t.fecha] || 0) + 1; return acc }, {})
  const turnosDia = turnos.filter(t => t.fecha === fecha)

  // ---- Coordinar (agendar) cirugía = crear turno tipo Cirugía ----
  function abrirCoordinar() { setFormTurno(turnoVacio()); setModalTurno(true) }
  async function guardarTurno() {
    if (!formTurno.externo && !formTurno.paciente_id) { mostrar("Elegí el paciente o cargá uno externo", "error"); return }
    if (formTurno.externo && !formTurno.paciente_libre.trim()) { mostrar("Poné el nombre de la mascota", "error"); return }
    setGuardando(true)
    const pac = pacientes.find(p => String(p.id) === formTurno.paciente_id)
    const { error } = await supabase.from("turnos").insert([{
      paciente_id: formTurno.externo ? null : (formTurno.paciente_id ? Number(formTurno.paciente_id) : null),
      cliente_id: formTurno.externo ? null : (pac?.cliente_id ?? pac?.clientes?.id ?? null),
      fecha, hora: formTurno.hora, duracion: 60, tipo: "Cirugía",
      profesional: formTurno.cirujano.trim() || null, notas: formTurno.notas.trim() || null,
      ...camposExternoPayload(formTurno),
    }])
    setGuardando(false)
    if (error) { mostrar("Error: " + error.message, "error"); return }
    mostrar("Cirugía agendada", "ok"); setModalTurno(false); cargar()
  }

  // ---- Registro quirúrgico (tabla cirugias) ----
  function abrirRegistroNuevo() { setFormCirugia({ ...cirugiaVacia(), fecha, paciente_id: filtroPaciente || "" }); setModalCirugia(true) }
  function abrirRegistroDesdeTurno(t: any) {
    const existente = cirugiaPorTurno.get(Number(t.id))
    if (existente) { abrirEditarCirugia(existente); return }
    setFormCirugia({
      ...cirugiaVacia(), paciente_id: t.paciente_id ? String(t.paciente_id) : "", turno_id: Number(t.id), fecha: t.fecha, cirujano: t.profesional || "",
      externo: !t.paciente_id && !!(t.paciente_libre || t.propietario_nombre),
      paciente_libre: t.paciente_libre || "", especie: t.especie || "", raza: t.raza || "", edad: t.edad || "", sexo: t.sexo || "",
      propietario_nombre: t.propietario_nombre || "", propietario_apellido: t.propietario_apellido || "", propietario_telefono: t.propietario_telefono || "",
      monto: t.monto != null ? String(t.monto) : "",
    })
    setModalCirugia(true)
  }
  function abrirEditarCirugia(c: any) {
    setFormCirugia({
      id: c.id, paciente_id: c.paciente_id ? String(c.paciente_id) : "", turno_id: c.turno_id ?? null,
      fecha: c.fecha || hoyISO(), estado: c.estado || "realizada", cirujano: c.cirujano || "", ayudante: c.ayudante || "",
      anestesia: c.anestesia || "", procedimiento: c.procedimiento || "", diagnostico: c.diagnostico || "",
      hallazgos: c.hallazgos || "", complicaciones: c.complicaciones || "", indicaciones: c.indicaciones || "", notas: c.notas || "",
      externo: !c.paciente_id && !!(c.paciente_libre || c.propietario_nombre),
      paciente_libre: c.paciente_libre || "", especie: c.especie || "", raza: c.raza || "", edad: c.edad || "", sexo: c.sexo || "",
      propietario_nombre: c.propietario_nombre || "", propietario_apellido: c.propietario_apellido || "", propietario_telefono: c.propietario_telefono || "",
      monto: c.monto != null ? String(c.monto) : "",
    })
    setModalCirugia(true)
  }
  async function guardarCirugia() {
    if (!formCirugia.externo && !formCirugia.paciente_id) { mostrar("Elegí el paciente o cargá uno externo", "error"); return }
    if (formCirugia.externo && !formCirugia.paciente_libre.trim()) { mostrar("Poné el nombre de la mascota", "error"); return }
    if (!formCirugia.procedimiento.trim()) { mostrar("Indicá el procedimiento", "error"); return }
    setGuardando(true)
    const pac = pacientes.find(p => String(p.id) === formCirugia.paciente_id)
    const payload: any = {
      paciente_id: formCirugia.externo ? null : (formCirugia.paciente_id ? Number(formCirugia.paciente_id) : null),
      cliente_id: formCirugia.externo ? null : (pac?.cliente_id ?? pac?.clientes?.id ?? null),
      turno_id: formCirugia.turno_id,
      fecha: formCirugia.fecha, estado: formCirugia.estado,
      cirujano: formCirugia.cirujano.trim() || null, ayudante: formCirugia.ayudante.trim() || null,
      anestesia: formCirugia.anestesia.trim() || null, procedimiento: formCirugia.procedimiento.trim() || null,
      diagnostico: formCirugia.diagnostico.trim() || null, hallazgos: formCirugia.hallazgos.trim() || null,
      complicaciones: formCirugia.complicaciones.trim() || null, indicaciones: formCirugia.indicaciones.trim() || null,
      notas: formCirugia.notas.trim() || null,
      ...camposExternoPayload(formCirugia),
    }
    try {
      if (formCirugia.id) {
        const { error } = await supabase.from("cirugias").update(payload).eq("id", formCirugia.id); if (error) throw error
        mostrar("Cirugía actualizada", "ok")
      } else {
        const { error } = await supabase.from("cirugias").insert([payload]); if (error) throw error
        mostrar("Cirugía registrada", "ok")
      }
      setModalCirugia(false); cargar()
    } catch (e: any) { mostrar("Error: " + (e?.message || "desconocido"), "error") } finally { setGuardando(false) }
  }
  async function eliminarCirugia() {
    if (!confirmEliminar) return
    const { error } = await supabase.from("cirugias").delete().eq("id", confirmEliminar.id)
    if (error) mostrar("Error al eliminar", "error")
    else { mostrar("Registro eliminado", "ok"); setCirugias(prev => prev.filter(x => x.id !== confirmEliminar.id)) }
    setConfirmEliminar(null)
  }

  const cirugiasFiltradas = cirugias.filter(c => !filtroPaciente || String(c.paciente_id) === filtroPaciente)
  const tutorDe = (x: any) => x.clientes ? `${x.clientes.nombre || ""} ${x.clientes.apellido || ""}`.trim() : ""
  const nombrePac = (x: any) => x.pacientes?.nombre || x.paciente_libre || "Paciente"
  const especiePac = (x: any) => x.pacientes?.especie || x.especie || ""
  const propDe = (x: any) => tutorDe(x) || `${x.propietario_nombre || ""} ${x.propietario_apellido || ""}`.trim()
  const telDe = (x: any) => x.clientes?.telefono || x.propietario_telefono || ""
  const esExterno = (x: any) => !x.paciente_id && !!(x.paciente_libre || x.propietario_nombre)

  return (
    <div>
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}

      {/* Navegación de mes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => moverMes(-1)} title="Mes anterior" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: "#475569" }}>←</button>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#1d1b12", textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>{mesNombre(mesAncla)}</span>
          <button onClick={() => moverMes(1)} title="Mes siguiente" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: "#475569" }}>→</button>
          <button onClick={() => { setMesAncla(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setFecha(hoyISO()) }} style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#7e22ce" }}>Hoy</button>
          <button onClick={abrirPrecios} title="Ver el nomenclador / precios cargados" style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0e7490", whiteSpace: "nowrap" }}>💲 Precios del mes</button>
        </div>
        <button onClick={abrirCoordinar} style={{ background: MORADO, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Coordinar cirugía</button>
      </div>

      {/* Calendario del mes (solo cirugías) */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {DIAS_SEM.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {celdasMes(mesAncla).map((d, i) => {
            if (!d) return <div key={i} />
            const iso = isoLocal(d)
            const n = turnosPorDia[iso] || 0
            const sel = iso === fecha
            const esHoy = iso === hoyISO()
            return (
              <button key={i} onClick={() => setFecha(iso)}
                style={{ minHeight: 56, borderRadius: 10, padding: "6px 4px", cursor: "pointer", textAlign: "center", position: "relative",
                  border: sel ? `2px solid ${MORADO}` : esHoy ? "1px solid #e9d5ff" : "1px solid #eef0f3",
                  background: sel ? "#faf5ff" : "white" }}>
                <div style={{ fontSize: 13, fontWeight: esHoy || sel ? 800 : 600, color: sel ? "#7e22ce" : "#1d1b12" }}>{d.getDate()}</div>
                {n > 0 && <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: "white", background: MORADO, borderRadius: 999, padding: "1px 6px", display: "inline-block" }}>{n}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cirugías agendadas para el día seleccionado */}
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1d1b12", textTransform: "capitalize", marginBottom: 4 }}>{fechaLarga(fecha)}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>{turnosDia.length} cirugía{turnosDia.length !== 1 ? "s" : ""} agendada{turnosDia.length !== 1 ? "s" : ""}</div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>
      ) : turnosDia.length === 0 ? (
        <div style={{ textAlign: "center", padding: "34px 20px", color: "#94a3b8", background: "white", border: "1px dashed #e2e8f0", borderRadius: 12, marginBottom: 26 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🔪</div>
          <p style={{ fontWeight: 600, color: "#475569", margin: 0 }}>No hay cirugías agendadas este día</p>
          <button onClick={abrirCoordinar} style={{ marginTop: 10, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#7e22ce" }}>+ Coordinar cirugía este día</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {turnosDia.map(t => {
            const yaReg = cirugiaPorTurno.get(Number(t.id))
            return (
              <div key={t.id} className="list-row" style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: `4px solid ${MORADO}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", background: "#faf5ff", color: "#7e22ce", borderRadius: 9, padding: "8px 12px", minWidth: 66, fontWeight: 800, fontSize: 16 }}>{(t.hora || "").slice(0, 5)}</div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1d1b12" }}>
                    {t.pacientes ? <Link href={`/pacientes/${t.paciente_id}`} style={{ color: "#1d1b12", textDecoration: "none" }}>🐾 {t.pacientes.nombre}</Link> : <>🐾 {nombrePac(t)}</>}
                    {especiePac(t) && <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: 13 }}> · {especiePac(t)}</span>}
                    {esExterno(t) && <span style={{ marginLeft: 8, background: "#faf5ff", color: "#7e22ce", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>EXTERNO</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                    {propDe(t) && <span>👤 {propDe(t)}</span>}{telDe(t) && <span> · 📞 {telDe(t)}</span>}{t.profesional && <span> · 🔪 {t.profesional}</span>}{fmtMonto(t.monto) && <span> · 💲 {fmtMonto(t.monto)}</span>}{t.notas && <span> · {t.notas}</span>}
                  </div>
                </div>
                {yaReg
                  ? <span style={{ background: ESTADOS.realizada.bg, color: ESTADOS.realizada.color, border: `1px solid ${ESTADOS.realizada.bd}`, borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700 }}>✓ Registrada</span>
                  : null}
                <button onClick={() => abrirRegistroDesdeTurno(t)}
                  style={{ background: yaReg ? "#f1f5f9" : MORADO, color: yaReg ? "#475569" : "white", border: yaReg ? "1px solid #e2e8f0" : "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {yaReg ? "Ver registro" : "Registrar cirugía"}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Registro quirúrgico (cirugías realizadas) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1d1b12", margin: 0 }}>Registro quirúrgico ({cirugiasFiltradas.length})</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 12px" }}>
            <option value="">Todos los pacientes</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.especie ? ` (${p.especie})` : ""}</option>)}
          </select>
          <button onClick={abrirRegistroNuevo} style={{ background: "white", border: `1px solid ${MORADO}`, color: MORADO, borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Registrar cirugía</button>
        </div>
      </div>

      {cirugiasFiltradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "34px 20px", color: "#94a3b8" }}>
          <p style={{ fontWeight: 600, color: "#475569" }}>Todavía no hay cirugías registradas.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cirugiasFiltradas.map(c => {
            const est = ESTADOS[c.estado] || ESTADOS.realizada
            return (
              <div key={c.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1d1b12" }}>
                      {c.procedimiento || "Cirugía"}
                      <span style={{ marginLeft: 8, background: est.bg, color: est.color, border: `1px solid ${est.bd}`, borderRadius: 999, padding: "2px 9px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3 }}>{est.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>
                      {c.pacientes ? <Link href={`/pacientes/${c.paciente_id}`} style={{ color: "#475569", fontWeight: 700, textDecoration: "none" }}>🐾 {c.pacientes.nombre}</Link> : <>🐾 {nombrePac(c)}</>}
                      {esExterno(c) && <span style={{ marginLeft: 6, background: "#faf5ff", color: "#7e22ce", fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>EXTERNO</span>}
                      {propDe(c) && <span> · 👤 {propDe(c)}</span>}
                      <span> · 🗓 {fechaCorta(c.fecha)}</span>
                      {c.cirujano && <span> · 🔪 {c.cirujano}</span>}
                      {fmtMonto(c.monto) && <span> · 💲 <b style={{ color: "#15803d" }}>{fmtMonto(c.monto)}</b></span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => abrirEditarCirugia(c)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, color: "#475569", cursor: "pointer", fontWeight: 700 }}>✎ Ver / editar</button>
                    {esAdmin && <button onClick={() => setConfirmEliminar(c)} title="Eliminar (solo admin)" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, color: "#dc2626", cursor: "pointer" }}>🗑</button>}
                  </div>
                </div>
                {(c.diagnostico || c.hallazgos || c.indicaciones || c.complicaciones) && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155" }}>
                    {c.diagnostico && <div><b style={{ color: "#7e22ce" }}>Dx:</b> {c.diagnostico}</div>}
                    {c.hallazgos && <div><b style={{ color: "#7e22ce" }}>Hallazgos:</b> {c.hallazgos}</div>}
                    {c.complicaciones && <div><b style={{ color: "#b91c1c" }}>Complicaciones:</b> {c.complicaciones}</div>}
                    {c.indicaciones && <div><b style={{ color: "#7e22ce" }}>Post-op:</b> {c.indicaciones}</div>}
                  </div>
                )}
                {c.creado_por && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>👤 {c.creado_por}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal coordinar (agendar turno cirugía) */}
      {modalTurno && (
        <div onClick={() => setModalTurno(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>Coordinar cirugía</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b" }}>Se agenda para el <b style={{ textTransform: "capitalize" }}>{fechaLarga(fecha)}</b>. Aparece en el calendario y en Turnos.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Paciente</label>
                <ToggleExterno externo={formTurno.externo} onChange={v => setFormTurno({ ...formTurno, externo: v })} />
              </div>
              {formTurno.externo
                ? <CamposExterno f={formTurno} upd={patch => setFormTurno({ ...formTurno, ...patch })} />
                : <ComboBox options={opcionesPaciente} value={formTurno.paciente_id} onChange={v => setFormTurno({ ...formTurno, paciente_id: v })} placeholder="Buscar por mascota, tutor o teléfono…" allowEmpty={false} />}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={formTurno.hora} onChange={e => setFormTurno({ ...formTurno, hora: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Monto (opcional)</label>
                  <input type="number" min="0" value={formTurno.monto} onChange={e => setFormTurno({ ...formTurno, monto: e.target.value })} placeholder="$" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Cirujano</label>
                <SelectorCirujano vets={vets} value={formTurno.cirujano} onChange={v => setFormTurno({ ...formTurno, cirujano: v })} />
              </div>
              <div>
                <label style={labelStyle}>Notas / procedimiento previsto</label>
                <input value={formTurno.notas} onChange={e => setFormTurno({ ...formTurno, notas: e.target.value })} placeholder="Ej: Castración, extracción de masa…" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalTurno(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarTurno} disabled={guardando} style={{ background: MORADO, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardando ? "wait" : "pointer" }}>{guardando ? "Agendando…" : "Agendar cirugía"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registro quirúrgico */}
      {modalCirugia && (
        <div onClick={() => setModalCirugia(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>{formCirugia.id ? "Cirugía" : "Registrar cirugía"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Paciente</label>
                <ToggleExterno externo={formCirugia.externo} onChange={v => setFormCirugia({ ...formCirugia, externo: v })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                {formCirugia.externo
                  ? <CamposExterno f={formCirugia} upd={patch => setFormCirugia({ ...formCirugia, ...patch })} />
                  : <ComboBox options={opcionesPaciente} value={formCirugia.paciente_id} onChange={v => setFormCirugia({ ...formCirugia, paciente_id: v })} placeholder="Buscar por mascota, tutor o teléfono…" allowEmpty={false} />}
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={formCirugia.fecha} onChange={e => setFormCirugia({ ...formCirugia, fecha: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={formCirugia.estado} onChange={e => setFormCirugia({ ...formCirugia, estado: e.target.value })} style={inputStyle}>
                  {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Monto (opcional)</label>
                <input type="number" min="0" value={formCirugia.monto} onChange={e => setFormCirugia({ ...formCirugia, monto: e.target.value })} placeholder="$" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Procedimiento *</label>
                <input value={formCirugia.procedimiento} onChange={e => setFormCirugia({ ...formCirugia, procedimiento: e.target.value })} placeholder="Ej: Ovariohisterectomía, castración, esplenectomía…" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Cirujano</label>
                <SelectorCirujano vets={vets} value={formCirugia.cirujano} onChange={v => setFormCirugia({ ...formCirugia, cirujano: v })} />
              </div>
              <div>
                <label style={labelStyle}>Ayudante</label>
                <input value={formCirugia.ayudante} onChange={e => setFormCirugia({ ...formCirugia, ayudante: e.target.value })} placeholder="Opcional" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Anestesia</label>
                <input value={formCirugia.anestesia} onChange={e => setFormCirugia({ ...formCirugia, anestesia: e.target.value })} placeholder="Protocolo / tipo" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Diagnóstico</label>
                <input value={formCirugia.diagnostico} onChange={e => setFormCirugia({ ...formCirugia, diagnostico: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Hallazgos</label>
                <textarea value={formCirugia.hallazgos} onChange={e => setFormCirugia({ ...formCirugia, hallazgos: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Complicaciones</label>
                <input value={formCirugia.complicaciones} onChange={e => setFormCirugia({ ...formCirugia, complicaciones: e.target.value })} placeholder="Si las hubo" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Indicaciones post-operatorias</label>
                <textarea value={formCirugia.indicaciones} onChange={e => setFormCirugia({ ...formCirugia, indicaciones: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={formCirugia.notas} onChange={e => setFormCirugia({ ...formCirugia, notas: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalCirugia(false)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarCirugia} disabled={guardando} style={{ background: MORADO, border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardando ? "wait" : "pointer" }}>{guardando ? "Guardando…" : formCirugia.id ? "Guardar cambios" : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <div onClick={() => setConfirmEliminar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 6 }}>¿Eliminar este registro de cirugía?</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{confirmEliminar.procedimiento || "Cirugía"} · {fechaCorta(confirmEliminar.fecha)}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={eliminarCirugia} style={{ background: "#dc2626", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 700, color: "white", cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Precios del mes (nomenclador) */}
      {modalPrecios && (
        <div onClick={() => setModalPrecios(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "24px 26px", width: "100%", maxWidth: 900, margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#1d1b12" }}>💲 Precios del mes · Nomenclador</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Subí las imágenes del nomenclador. Tocá una imagen para agrandarla y leer los precios.</p>
              </div>
              <button onClick={() => setModalPrecios(false)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 14, color: "#475569", cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>

            {/* Zona para subir */}
            <input ref={preciosFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" onChange={e => tomarPrecio(e.target.files?.[0])} style={{ display: "none" }} />
            <div
              onClick={() => !subiendoPrecio && preciosFileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setArrastrandoPrecio(true) }}
              onDragLeave={e => { e.preventDefault(); setArrastrandoPrecio(false) }}
              onDrop={e => { e.preventDefault(); setArrastrandoPrecio(false); tomarPrecio(e.dataTransfer.files?.[0]) }}
              style={{ margin: "16px 0", border: `2px dashed ${arrastrandoPrecio ? "#0891b2" : "#cbd5e1"}`, borderRadius: 12, padding: "18px 16px", textAlign: "center", cursor: subiendoPrecio ? "wait" : "pointer", background: arrastrandoPrecio ? "#ecfeff" : "#f8fafc" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{subiendoPrecio ? "⏳" : "⬆️"}</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#475569" }}>{subiendoPrecio ? "Subiendo…" : arrastrandoPrecio ? "Soltá la imagen acá" : "Arrastrá una imagen o PDF, o hacé clic para elegir"}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Imágenes o PDF · hasta 25 MB</div>
            </div>

            {cargandoPrecios ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: 30 }}>Cargando…</p>
            ) : precios.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>🧾</div>
                <p style={{ fontWeight: 600, color: "#475569", margin: 0 }}>Todavía no hay precios cargados</p>
                <p style={{ fontSize: 12.5, marginTop: 4 }}>Subí las imágenes del nomenclador de este mes.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {precios.map(p => (
                  <div key={p.path} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: 12.5, color: "#475569", fontWeight: 600, wordBreak: "break-word" }}>{p.isPdf ? "📄 " : "🖼️ "}{p.name.replace(/^\d+_/, "")}</span>
                      <button onClick={() => setConfirmBorrarPrecio(p)} title="Eliminar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", fontSize: 12, color: "#dc2626", cursor: "pointer", flexShrink: 0 }}>🗑</button>
                    </div>
                    {p.isPdf ? (
                      <a href={p.url} target="_blank" rel="noreferrer" style={{ display: "block", padding: "22px", textAlign: "center", color: "#0891b2", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>📄 Abrir PDF del nomenclador</a>
                    ) : (
                      <img src={p.url} alt={p.name} onClick={() => p.url && setLightbox(p.url)} style={{ display: "block", width: "100%", height: "auto", cursor: "zoom-in" }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox (imagen a pantalla grande) */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16, flexDirection: "column", gap: 12 }}>
          <img src={lightbox} alt="Nomenclador" onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <a href={lightbox} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 9, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, color: "#0e7490", textDecoration: "none" }}>🔍 Abrir original (zoom)</a>
            <button onClick={() => setLightbox(null)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 9, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, color: "white", cursor: "pointer" }}>Cerrar ✕</button>
          </div>
        </div>
      )}

      {/* Confirmar borrar precio */}
      {confirmBorrarPrecio && (
        <div onClick={() => setConfirmBorrarPrecio(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "26px 28px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑</div>
            <p style={{ fontWeight: 700, color: "#1d1b12", marginBottom: 20 }}>¿Eliminar esta imagen de precios?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setConfirmBorrarPrecio(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
              <button onClick={eliminarPrecio} style={{ background: "#dc2626", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 700, color: "white", cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
