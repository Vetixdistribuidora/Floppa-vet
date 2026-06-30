"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { abrirWhatsApp } from "@/lib/whatsapp"
import { empresaNombre } from "@/lib/empresa"
import Icon from "@/components/Icon"

const OLIVA = "var(--accent)"
const hoyISO = () => new Date().toLocaleDateString("sv-SE")
const card: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }
const h3: React.CSSProperties = { margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#1d1b12" }

function diasHasta(fecha: string): number {
  const f = new Date(fecha + "T00:00:00"); const h = new Date(); h.setHours(0, 0, 0, 0)
  return Math.round((f.getTime() - h.getTime()) / 86400000)
}
function diasHastaCumple(fnac: string): number | null {
  if (!fnac) return null
  const h = new Date(); h.setHours(0, 0, 0, 0)
  const n = new Date(fnac + "T00:00:00")
  let next = new Date(h.getFullYear(), n.getMonth(), n.getDate())
  if (next < h) next = new Date(h.getFullYear() + 1, n.getMonth(), n.getDate())
  return Math.round((next.getTime() - h.getTime()) / 86400000)
}
function edadAnios(fnac: string): number | null {
  if (!fnac) return null
  const n = new Date(fnac + "T00:00:00"), h = new Date()
  let a = h.getFullYear() - n.getFullYear()
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--
  return a
}

const ESTADO_COL: Record<string, string> = { reservado: "#1d4ed8", confirmado: "var(--accent-dark)", atendido: "#15803d", ausente: "#dc2626", cancelado: "#64748b" }

export default function DashboardVet() {
  const [loading, setLoading] = useState(true)
  const [turnos, setTurnos] = useState<any[]>([])
  const [internados, setInternados] = useState<any[]>([])
  const [sanidad, setSanidad] = useState<any[]>([])
  const [cumples, setCumples] = useState<any[]>([])
  const [aCobrar, setACobrar] = useState<any[]>([])
  const [sala, setSala] = useState<any[]>([])
  const [nPacientes, setNPacientes] = useState(0)
  const [nTutores, setNTutores] = useState(0)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const hoy = hoyISO()
    const en7 = new Date(); en7.setDate(en7.getDate() + 7)
    const en7Str = en7.toLocaleDateString("sv-SE")
    const [tt, ii, san, pac, tut, cob, sal] = await Promise.all([
      supabase.from("turnos").select("*, pacientes(nombre), clientes(nombre, apellido, telefono)").eq("fecha", hoy).order("hora"),
      supabase.from("internaciones").select("*, pacientes(nombre, especie)").eq("estado", "internado").order("fecha_ingreso", { ascending: false }),
      supabase.from("recordatorios").select("*, pacientes(nombre, fallecido, clientes(nombre, telefono))").neq("estado", "hecho").lte("fecha", en7Str).order("fecha"),
      supabase.from("pacientes").select("id, nombre, especie, fecha_nacimiento, clientes(nombre, apellido, telefono)").eq("fallecido", false),
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("consultas").select("id, para_cobrar, cobrar_items, cobrado, pacientes(nombre)").not("para_cobrar", "is", null).eq("cobrado", false),
      supabase.from("sala_espera").select("*, pacientes(id, nombre, especie)").neq("estado", "atendido").order("check_in_at"),
    ])
    setTurnos(tt.data || [])
    setInternados(ii.data || [])
    setSala(sal.data || [])
    setSanidad((san.data || []).filter((r: any) => !r.pacientes?.fallecido))
    const pacientes = pac.data || []
    setNPacientes(pacientes.length)
    setNTutores(tut.count || 0)
    setACobrar(cob.data || [])
    // Cumpleaños próximos 7 días
    const cs = pacientes
      .map((p: any) => ({ ...p, dias: diasHastaCumple(p.fecha_nacimiento) }))
      .filter((p: any) => p.dias != null && p.dias <= 7)
      .sort((a: any, b: any) => a.dias - b.dias)
    setCumples(cs)
    setLoading(false)
  }

  function saludarCumple(p: any) {
    const cli = p.clientes
    const emp = empresaNombre()
    const msg = `Hola${cli?.nombre ? " " + cli.nombre : ""}! 🎂 En ${emp || "la veterinaria"} le queremos desear un muy feliz cumpleaños a ${p.nombre} 🐾🎉. ¡Un abrazo!`
    if (!abrirWhatsApp(cli?.telefono, msg)) alert("El tutor no tiene teléfono cargado")
  }
  function recordarVacuna(r: any) {
    const cli = r.pacientes?.clientes
    const emp = empresaNombre()
    const fechaTxt = r.fecha ? new Date(r.fecha + "T00:00:00").toLocaleDateString("es-AR") : ""
    const msg = `Hola${cli?.nombre ? " " + cli.nombre : ""}! 🐾 Te recordamos que ${r.pacientes?.nombre || "tu mascota"} tiene ${r.tipo || "un control"} para el ${fechaTxt}. ¡Te esperamos!${emp ? "\n" + emp : ""}`
    if (!abrirWhatsApp(cli?.telefono, msg)) alert("El tutor no tiene teléfono cargado")
  }

  const turnosPend = turnos.filter(t => t.estado === "reservado" || t.estado === "confirmado").length
  const sanVencidas = sanidad.filter(r => diasHasta(r.fecha) < 0).length
  const totalACobrar = aCobrar.reduce((s, c) => {
    const items = Array.isArray(c.cobrar_items) ? c.cobrar_items : []
    return s + items.reduce((a: number, i: any) => a + (Number(i.precio) || 0) * (Number(i.cantidad) || 0), 0)
  }, 0)
  const salaEsperando = sala.filter(s => s.estado === "esperando").length
  const salaAtendiendo = sala.filter(s => s.estado === "atendiendo").length

  const kpis = [
    { titulo: "En sala", valor: sala.length, sub: `${salaEsperando} esperando · ${salaAtendiendo} en atención`, icon: "users", color: "#0d9488", href: "/sala" },
    { titulo: "Turnos hoy", valor: turnos.length, sub: `${turnosPend} pendiente${turnosPend !== 1 ? "s" : ""}`, icon: "calendar", color: "#38bdf8", href: "/turnos" },
    { titulo: "Internados", valor: internados.length, sub: "en seguimiento", icon: "hospital", color: "#fb7185", href: "/internacion" },
    { titulo: "Sanidad 7 días", valor: sanidad.length, sub: `${sanVencidas} vencida${sanVencidas !== 1 ? "s" : ""}`, icon: "activity", color: "#f59e0b", href: "/recordatorios" },
    { titulo: "Pre Venta", valor: "$" + Math.round(totalACobrar).toLocaleString("es-AR"), sub: `${aCobrar.length} pendiente${aCobrar.length !== 1 ? "s" : ""}`, icon: "dollar", color: "#22c55e", href: "/cobros" },
    { titulo: "Pacientes", valor: nPacientes, sub: `${nTutores} tutores`, icon: "paw", color: "#5ec5c0", href: "/pacientes" },
  ]

  if (loading) return <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando…</p>

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(200px, 100%), 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map(k => (
          <Link key={k.titulo} href={k.href} style={{ textDecoration: "none" }}>
            <div style={{ ...card, position: "relative", overflow: "hidden", cursor: "pointer" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: k.color, borderRadius: "16px 0 0 16px" }} />
              <div style={{ paddingLeft: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase" }}>{k.titulo}</span>
                  <Icon name={k.icon} size={18} color={k.color} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#1d1b12", lineHeight: 1 }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{k.sub}<span style={{ color: k.color, marginLeft: 6, fontWeight: 600 }}>Ver →</span></div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-grafico">
        {/* Sala de espera */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ ...h3, margin: 0 }}>Sala de espera</h3>
            <Link href="/sala" style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Ver sala →</Link>
          </div>
          {sala.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Sala vacía.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sala.slice(0, 6).map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                  <span style={{ minWidth: 18, fontWeight: 800, color: s.prioridad === "urgente" ? "#dc2626" : "#94a3b8" }}>{s.estado === "atendiendo" ? "▶" : i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ color: "#1d1b12" }}>{s.pacientes?.nombre || s.nombre_libre || "Paciente"}</b>
                    {s.motivo ? <span style={{ color: "#64748b" }}> · {s.motivo}</span> : ""}
                  </span>
                  {s.prioridad === "urgente" && <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999 }}>URGENTE</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.estado === "atendiendo" ? "#0d9488" : "#94a3b8" }}>{s.estado === "atendiendo" ? "en atención" : "espera"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Turnos de hoy */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ ...h3, margin: 0 }}>Turnos de hoy</h3>
            <Link href="/turnos" style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Ver agenda →</Link>
          </div>
          {turnos.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No hay turnos para hoy.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {turnos.slice(0, 6).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                  <span style={{ fontWeight: 800, color: "var(--accent-dark)", minWidth: 46 }}>{(t.hora || "").slice(0, 5)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: "#1d1b12" }}>{t.tipo || "Turno"}</b>{t.pacientes ? ` · ${t.pacientes.nombre}` : ""}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COL[t.estado] || "#64748b", textTransform: "capitalize" }}>{t.estado}</span>
                </div>
              ))}
              {turnos.length > 6 && <div style={{ fontSize: 12, color: "#94a3b8" }}>+{turnos.length - 6} más…</div>}
            </div>
          )}
        </div>

        {/* Sanidad próxima */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ ...h3, margin: 0 }}>Sanidad por vencer</h3>
            <Link href="/recordatorios" style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Ver todo →</Link>
          </div>
          {sanidad.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Nada pendiente en 7 días. ✓</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sanidad.slice(0, 6).map(r => {
                const d = diasHasta(r.fecha)
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                    <span style={{ minWidth: 60, fontSize: 11, fontWeight: 700, color: d < 0 ? "#dc2626" : "#d97706" }}>{d < 0 ? `vencida` : d === 0 ? "hoy" : `en ${d}d`}</span>
                    <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: "#1d1b12" }}>{r.tipo}</b>{r.pacientes ? ` · ${r.pacientes.nombre}` : ""}</span>
                    {r.pacientes?.clientes?.telefono && (
                      <button onClick={() => recordarVacuna(r)} title="Recordar por WhatsApp" style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 12, color: "#15803d", fontWeight: 700 }}>💬</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Internados */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ ...h3, margin: 0 }}>Internados</h3>
            <Link href="/internacion" style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Ver →</Link>
          </div>
          {internados.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No hay pacientes internados.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {internados.slice(0, 6).map(i => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                  <span><b style={{ color: "#1d1b12" }}>{i.pacientes?.nombre || "—"}</b>{i.motivo ? ` · ${i.motivo}` : ""}</span>
                  <span style={{ color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap" }}>desde {new Date(i.fecha_ingreso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cumpleaños */}
        <div style={card}>
          <h3 style={h3}>Cumpleaños esta semana</h3>
          {cumples.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Sin cumpleaños próximos.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cumples.slice(0, 6).map(p => {
                const a = edadAnios(p.fecha_nacimiento)
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                    <span style={{ minWidth: 56, fontSize: 11, fontWeight: 700, color: p.dias === 0 ? "#15803d" : "#b45309" }}>{p.dias === 0 ? "¡hoy!" : `en ${p.dias}d`}</span>
                    <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: "#1d1b12" }}>{p.nombre}</b>{a != null ? ` · ${a + (p.dias === 0 ? 0 : 1)} años` : ""}{p.clientes ? ` · ${p.clientes.nombre || ""}` : ""}</span>
                    {p.clientes?.telefono && (
                      <button onClick={() => saludarCumple(p)} title="Saludar por WhatsApp" style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 12, color: "#15803d", fontWeight: 700 }}>💬</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
