"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { empresaLogo, empresaInfoHTML, empresaNombre } from "@/lib/empresa"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const OLIVA = "#6f7d49"
const f = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—"
function edadDe(fecha: string | null): string {
  if (!fecha) return "—"
  const n = new Date(fecha + "T00:00:00"), hoy = new Date()
  let meses = (hoy.getFullYear() - n.getFullYear()) * 12 + (hoy.getMonth() - n.getMonth())
  if (hoy.getDate() < n.getDate()) meses--
  if (meses < 0) return "—"
  const a = Math.floor(meses / 12), m = meses % 12
  return a === 0 ? `${m} mes${m !== 1 ? "es" : ""}` : `${a} año${a !== 1 ? "s" : ""}${m ? ` ${m}m` : ""}`
}

const card: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }
const h3: React.CSSProperties = { margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#0f172a" }

export default function FichaPaciente() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [p, setP] = useState<any>(null)
  const [consultas, setConsultas] = useState<any[]>([])
  const [estudios, setEstudios] = useState<any[]>([])
  const [sanidad, setSanidad] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    setCargando(true)
    const [{ data: pac }, { data: con }, { data: est }, { data: san }] = await Promise.all([
      supabase.from("pacientes").select("*, clientes(nombre, apellido, telefono, email, localidad)").eq("id", id).maybeSingle(),
      supabase.from("consultas").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
      supabase.from("estudios").select("*").eq("paciente_id", id).order("created_at", { ascending: false }),
      supabase.from("recordatorios").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
    ])
    setP(pac); setConsultas(con || []); setEstudios(est || []); setSanidad(san || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [id])

  async function abrirEstudio(e: any) {
    const { data } = await supabase.storage.from("estudios").createSignedUrl(e.archivo_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  // Datos del gráfico de peso (consultas con peso, en orden cronológico)
  const pesos = [...consultas].filter(c => c.peso != null).sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
    .map(c => ({ fecha: f(c.fecha), peso: Number(c.peso) }))

  function imprimirCarnet() {
    const vacunas = sanidad.filter(s => (s.tipo || "").toLowerCase().includes("vacuna") || (s.tipo || "").toLowerCase().includes("desparasit"))
    const filas = vacunas.length
      ? vacunas.sort((a, b) => (b.fecha_aplicacion || b.fecha || "").localeCompare(a.fecha_aplicacion || a.fecha || ""))
        .map(s => `<tr><td>${s.tipo || ""}</td><td>${s.descripcion || ""}</td><td>${f(s.fecha_aplicacion)}</td><td>${f(s.fecha)}</td></tr>`).join("")
      : `<tr><td colspan="4" style="text-align:center;color:#888">Sin registros de vacunación</td></tr>`
    const dueño = p.clientes ? `${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim() : "—"
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <style>*{box-sizing:border-box}body{font-family:Arial;margin:0;background:#e5e7eb}.acc{display:flex;gap:10px;padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
      .pg{max-width:780px;margin:16px auto;background:#fff;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.12)}
      .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${OLIVA};padding-bottom:14px;margin-bottom:18px}
      .logo{height:90px}.info{font-size:11px;color:#555;margin-top:4px;line-height:1.5}
      h1{font-size:20px;color:${OLIVA};margin:0}.sub{font-size:13px;color:#555}
      .row{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:13px;line-height:1.9;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{background:${OLIVA};color:#fff;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #eee}
      @media print{body{background:#fff}.acc{display:none}.pg{box-shadow:none;margin:0;max-width:100%}}</style></head><body>
      <div class="acc"><button onclick="window.print()" style="background:${OLIVA};color:#fff;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
      <button onclick="window.close()" style="background:#f1f5f9;border:1px solid #d1d5db;border-radius:8px;padding:10px 18px;cursor:pointer">Cerrar</button></div>
      <div class="pg"><div class="hd"><div><img src="${empresaLogo()}" class="logo"/><div class="info">${empresaInfoHTML()}</div></div>
      <div style="text-align:right"><h1>Carnet de vacunación</h1><div class="sub">${empresaNombre()}</div></div></div>
      <div class="row"><b>Paciente:</b> ${p.nombre} &nbsp;|&nbsp; <b>Especie:</b> ${p.especie || "—"} &nbsp;|&nbsp; <b>Raza:</b> ${p.raza || "—"} &nbsp;|&nbsp; <b>Sexo:</b> ${p.sexo || "—"}<br/>
      <b>Nacimiento:</b> ${f(p.fecha_nacimiento)} &nbsp;|&nbsp; <b>Tutor:</b> ${dueño} &nbsp;|&nbsp; <b>Tel:</b> ${p.clientes?.telefono || "—"}</div>
      <table><thead><tr><th>Tipo</th><th>Detalle</th><th>Aplicada</th><th>Próxima</th></tr></thead><tbody>${filas}</tbody></table></div></body></html>`
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close() }
  }

  if (cargando) return <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando ficha…</p>
  if (!p) return <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Paciente no encontrado.</p>

  const dueño = p.clientes ? `${p.clientes.nombre || ""} ${p.clientes.apellido || ""}`.trim() : ""

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Volver + acciones */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button onClick={() => router.push("/pacientes")} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>← Pacientes</button>
        <button onClick={imprimirCarnet} style={{ background: OLIVA, color: "white", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨️ Carnet de vacunación</button>
      </div>

      {/* Cabecera del paciente */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>🐾 {p.nombre}</div>
          {(p.etiquetas || []).map((et: string) => <span key={et} style={{ background: "#eef0e0", color: "#4b5a2c", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{et}</span>)}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#475569", marginTop: 10 }}>
          <span><b style={{ color: "#64748b" }}>Especie:</b> {p.especie || "—"}</span>
          <span><b style={{ color: "#64748b" }}>Raza:</b> {p.raza || "—"}</span>
          <span><b style={{ color: "#64748b" }}>Sexo:</b> {p.sexo || "—"}</span>
          <span><b style={{ color: "#64748b" }}>Edad:</b> {edadDe(p.fecha_nacimiento)}</span>
          <span><b style={{ color: "#64748b" }}>Nac.:</b> {f(p.fecha_nacimiento)}</span>
          {p.peso != null && <span><b style={{ color: "#64748b" }}>Peso:</b> {p.peso} kg</span>}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
          <b style={{ color: "#64748b" }}>Tutor:</b> {dueño || "sin asignar"}{p.clientes?.telefono ? ` · 📞 ${p.clientes.telefono}` : ""}{p.clientes?.email ? ` · 📧 ${p.clientes.email}` : ""}
        </div>
        {p.notas && (
          <div style={{ marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
            <b style={{ color: "#b45309", fontWeight: 800 }}>Nota / patología:</b>{" "}
            <span style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "pre-wrap" }}>{p.notas}</span>
          </div>
        )}
      </div>

      {/* Gráfico de peso */}
      {pesos.length >= 2 && (
        <div style={card}>
          <h3 style={h3}>📈 Evolución del peso</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pesos} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0e0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} unit=" kg" width={52} />
              <Tooltip formatter={(v: any) => [`${v} kg`, "Peso"]} />
              <Line type="monotone" dataKey="peso" stroke={OLIVA} strokeWidth={2.5} dot={{ r: 3, fill: OLIVA }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sanidad */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ ...h3, margin: 0 }}>💉 Sanidad ({sanidad.length})</h3>
          <Link href={`/recordatorios`} style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Gestionar →</Link>
        </div>
        {sanidad.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Sin registros.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sanidad.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                <span><b style={{ color: "#0f172a" }}>{s.tipo}</b>{s.descripcion ? ` · ${s.descripcion}` : ""}</span>
                <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>{s.fecha_aplicacion ? `aplic. ${f(s.fecha_aplicacion)} · ` : ""}próx. <b style={{ color: "#0891b2" }}>{f(s.fecha)}</b></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consultas / historia clínica */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ ...h3, margin: 0 }}>📋 Historia clínica ({consultas.length})</h3>
          <Link href={`/consultas?paciente=${id}`} style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Gestionar →</Link>
        </div>
        {consultas.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Sin consultas.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {consultas.map(c => (
              <div key={c.id} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 9, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: "#475569", marginBottom: 3 }}>🗓 {f(c.fecha)}</div>
                {c.motivo && <div><b style={{ color: "#4b5a2c" }}>Motivo:</b> {c.motivo}</div>}
                {c.diagnostico && <div><b style={{ color: "#4b5a2c" }}>Dx:</b> {c.diagnostico}</div>}
                {c.tratamiento && <div><b style={{ color: "#4b5a2c" }}>Tto:</b> {c.tratamiento}</div>}
                {c.para_cobrar && !c.cobrado && <div style={{ color: "#c2410c", fontWeight: 700 }}>💲 A cobrar: {c.para_cobrar}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estudios */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ ...h3, margin: 0 }}>📎 Estudios ({estudios.length})</h3>
          <Link href={`/estudios?paciente=${id}`} style={{ fontSize: 12.5, color: OLIVA, fontWeight: 700, textDecoration: "none" }}>Gestionar →</Link>
        </div>
        {estudios.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Sin estudios.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {estudios.map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                <span><b style={{ color: "#0f172a" }}>{e.titulo}</b> <span style={{ color: "#94a3b8" }}>· {e.tipo} · {f(e.created_at?.slice(0, 10))}</span></span>
                <button onClick={() => abrirEstudio(e)} style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontSize: 12.5, color: "#0891b2", fontWeight: 700, whiteSpace: "nowrap" }}>⬇ Abrir</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
