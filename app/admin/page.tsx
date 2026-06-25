"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { RUBROS, MODULOS_TOGGLEABLES, PRESETS_RUBRO, modulosActivos } from "@/lib/modulos"

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || ""

function fechaLocal(f: string | null | undefined) {
  if (!f) return "—"
  return new Date(f + "T00:00:00").toLocaleDateString("es-AR")
}

const estadoBadge: Record<string, { color: string; bg: string; label: string }> = {
  owner:   { color: "#4ade80", bg: "rgba(74,222,128,0.12)",   label: "👑 Owner" },
  activo:  { color: "#4ade80", bg: "rgba(74,222,128,0.12)",   label: "✅ Activo" },
  trial:   { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",   label: "⏳ Trial" },
  vencido: { color: "#f87171", bg: "rgba(248,113,113,0.12)",  label: "❌ Vencido" },
}

export default function AdminPage() {
  const [suscripciones, setSuscripciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [esAdmin, setEsAdmin] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Verificar que sea el owner (tiene policy "owner_ve_todo" en Supabase)
    const { data, error } = await supabase
      .from("suscripciones")
      .select("*, planes(nombre, precio)")
      .order("creado_en", { ascending: false })

    // Si solo devuelve 1 fila (la propia), no es admin
    if (!error && data && data.length > 1) {
      setEsAdmin(true)
      setSuscripciones(data)
      cargarInvitaciones()
    } else if (!error && data?.length === 1 && data[0].estado === "owner") {
      setEsAdmin(true)
      setSuscripciones(data)
      cargarInvitaciones()
    } else {
      setEsAdmin(false)
    }
    setLoading(false)
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    await supabase.from("suscripciones").update({ estado: nuevoEstado }).eq("id", id)
    setSuscripciones(prev => prev.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s))
  }

  const [invitaciones, setInvitaciones] = useState<any[]>([])
  const [invForm, setInvForm] = useState<{ email: string; rubro: string; nota: string }>({ email: "", rubro: "", nota: "" })
  const [generandoInv, setGenerandoInv] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function cargarInvitaciones() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/invitaciones", { headers: { Authorization: `Bearer ${session?.access_token}` } })
    if (res.ok) setInvitaciones(await res.json())
  }
  async function generarInvitacion() {
    setGenerandoInv(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/invitaciones", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(invForm) })
    setGenerandoInv(false)
    if (res.ok) { const nueva = await res.json(); setInvitaciones(prev => [nueva, ...prev]); setInvForm({ email: "", rubro: "", nota: "" }) }
    else alert("No se pudo generar el código")
  }
  async function borrarInvitacion(id: number) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/admin/invitaciones?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token}` } })
    setInvitaciones(prev => prev.filter(i => i.id !== id))
  }
  function copiar(cod: string) { navigator.clipboard?.writeText(cod); setCopiado(cod); setTimeout(() => setCopiado(null), 1500) }

  const [editor, setEditor] = useState<any>(null)
  const [orgForm, setOrgForm] = useState<{ rubro: string; modulos: string[]; precio: string }>({ rubro: "distribuidora", modulos: [], precio: "" })
  const [cargandoOrg, setCargandoOrg] = useState(false)
  const [guardandoOrg, setGuardandoOrg] = useState(false)

  async function abrirEditorPlan(s: any) {
    if (!s.organizacion_id) { alert("Este cliente todavía no tiene organización (no completó el onboarding)."); return }
    setEditor(s); setCargandoOrg(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/org?org=${s.organizacion_id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
    const org = await res.json()
    setOrgForm({ rubro: org.rubro || "distribuidora", modulos: modulosActivos(org.modulos), precio: s.precio_custom != null ? String(s.precio_custom) : "" })
    setCargandoOrg(false)
  }
  function aplicarRubroAdmin(rubro: string) {
    // Personalizado: el admin cura los módulos a mano → NO pisar la selección actual.
    // Los demás rubros sí aplican su preset.
    setOrgForm(f => ({ ...f, rubro, modulos: rubro === "personalizado" ? f.modulos : (PRESETS_RUBRO[rubro] || f.modulos) }))
  }
  function toggleModAdmin(key: string) { setOrgForm(f => ({ ...f, modulos: f.modulos.includes(key) ? f.modulos.filter(k => k !== key) : [...f.modulos, key] })) }
  async function guardarPlan() {
    if (!editor) return
    setGuardandoOrg(true)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch("/api/admin/org", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ organizacion_id: editor.organizacion_id, rubro: orgForm.rubro, modulos: orgForm.modulos, precio_custom: orgForm.precio }) })
    setGuardandoOrg(false); setEditor(null); cargar()
  }

  const filtradas = suscripciones.filter(s =>
    s.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.nombre_negocio?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totales = {
    activos: suscripciones.filter(s => s.estado === "activo").length,
    trial:   suscripciones.filter(s => s.estado === "trial").length,
    vencidos: suscripciones.filter(s => s.estado === "vencido").length,
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <p style={{ color: "#9ca3af" }}>Cargando...</p>
    </div>
  )

  if (!esAdmin) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>🚫 Acceso restringido</p>
        <p style={{ color: "#6b7280", fontSize: 13 }}>Esta sección es solo para administradores.</p>
      </div>
    </div>
  )

  return (
    <div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total clientes", valor: suscripciones.length, color: "#6f7d49", icon: "👥" },
          { label: "Activos",         valor: totales.activos,       color: "#4ade80", icon: "✅" },
          { label: "En trial",        valor: totales.trial,         color: "#fbbf24", icon: "⏳" },
          { label: "Vencidos",        valor: totales.vencidos,      color: "#f87171", icon: "❌" },
        ].map(k => (
          <div key={k.label} style={{
            background: "white", borderRadius: 14, padding: "18px 20px",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: k.color, borderRadius: "14px 0 0 14px" }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</span>
                <span style={{ fontSize: 16 }}>{k.icon}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1d1b12" }}>{k.valor}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Invitaciones */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1d1b12" }}>🎟️ Invitaciones</h2>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Solo quien tenga un código puede registrarse.</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
          <div style={{ flex: "2 1 180px" }}>
            <label style={{ display: "block", fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Email (opcional, lo bloquea a ese mail)</label>
            <input value={invForm.email} onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1d1b12", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Rubro (opcional)</label>
            <select value={invForm.rubro} onChange={e => setInvForm(f => ({ ...f, rubro: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1d1b12", background: "white", boxSizing: "border-box" }}>
              <option value="">—</option>
              {RUBROS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ flex: "2 1 160px" }}>
            <label style={{ display: "block", fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Nota (a quién)</label>
            <input value={invForm.nota} onChange={e => setInvForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ej: Vet. San Roque" style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1d1b12", boxSizing: "border-box" }} />
          </div>
          <button onClick={generarInvitacion} disabled={generandoInv} style={{ background: "#6f7d49", color: "white", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: generandoInv ? "wait" : "pointer", whiteSpace: "nowrap" }}>{generandoInv ? "Generando…" : "+ Generar código"}</button>
        </div>

        {invitaciones.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {invitaciones.map(inv => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: 9, background: inv.usada ? "#f8fafc" : "white", flexWrap: "wrap" }}>
                <code style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: inv.usada ? "#94a3b8" : "#1d1b12", textDecoration: inv.usada ? "line-through" : "none" }}>{inv.codigo}</code>
                {!inv.usada && <button onClick={() => copiar(inv.codigo)} style={{ background: copiado === inv.codigo ? "#dcfce7" : "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "3px 9px", fontSize: 11.5, color: copiado === inv.codigo ? "#15803d" : "#475569", cursor: "pointer", fontWeight: 700 }}>{copiado === inv.codigo ? "✓ Copiado" : "Copiar"}</button>}
                <span style={{ fontSize: 12, color: "#64748b", flex: 1, minWidth: 100 }}>
                  {inv.nota ? inv.nota : ""}{inv.email ? ` · ${inv.email}` : ""}{inv.rubro ? ` · ${inv.rubro}` : ""}
                </span>
                {inv.usada
                  ? <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>usada{inv.usada_por ? ` · ${inv.usada_por}` : ""}</span>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", whiteSpace: "nowrap" }}>disponible</span>}
                <button onClick={() => borrarInvitacion(inv.id)} title="Borrar" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "3px 8px", fontSize: 11, color: "#dc2626", cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por email o nombre..."
          style={{
            width: "100%", padding: "10px 16px", borderRadius: 10,
            border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
            background: "white", color: "#1d1b12",
          }}
        />
      </div>

      {/* Tabla */}
      <div style={{ background: "#1d1b12", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
          gap: 12, padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <span>Negocio / Email</span>
          <span>Plan</span>
          <span>Vence</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>

        {filtradas.length === 0 && (
          <div style={{ padding: "24px 20px", color: "#4b5563", fontSize: 13, textAlign: "center" }}>
            Sin resultados
          </div>
        )}

        {filtradas.map((s, idx) => {
          const badge = estadoBadge[s.estado] || estadoBadge.trial
          return (
            <div key={s.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
              gap: 12, padding: "14px 20px", alignItems: "center",
              borderBottom: idx < filtradas.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              {/* Negocio / email */}
              <div>
                <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>
                  {s.nombre_negocio || <span style={{ color: "#4b5563", fontStyle: "italic" }}>Sin nombre</span>}
                </div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{s.email}</div>
              </div>

              {/* Plan */}
              <div style={{ color: "#9ca3af", fontSize: 12 }}>
                {s.estado === "owner" ? "Owner" : (s.planes?.nombre || "Mensual")}
              </div>

              {/* Fecha vencimiento */}
              <div style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>
                {s.estado === "owner" ? "—" : fechaLocal(s.fecha_vencimiento)}
              </div>

              {/* Badge estado */}
              <span style={{
                background: badge.bg, color: badge.color,
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                whiteSpace: "nowrap",
              }}>
                {badge.label}
              </span>

              {/* Acción rápida */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {s.estado !== "owner" && (
                  <select
                    value={s.estado}
                    onChange={e => cambiarEstado(s.id, e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6, color: "#9ca3af", fontSize: 11, padding: "4px 8px", cursor: "pointer",
                    }}>
                    <option value="trial">Trial</option>
                    <option value="activo">Activo</option>
                    <option value="vencido">Vencido</option>
                  </select>
                )}
                <button onClick={() => abrirEditorPlan(s)} title="Editar plan y módulos" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#cbd5e1", fontSize: 11, padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>⚙ Plan</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Editor de plan / módulos (solo admin Floppa) */}
      {editor && (
        <div onClick={() => setEditor(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#1d1b12" }}>Plan y módulos</h2>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>{editor.nombre_negocio || editor.email}</p>
            {cargandoOrg ? <p style={{ color: "#94a3b8" }}>Cargando…</p> : (
              <>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Rubro / plan</label>
                <select value={orgForm.rubro} onChange={e => aplicarRubroAdmin(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#1d1b12", background: "white", marginBottom: 18, boxSizing: "border-box" }}>
                  {RUBROS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Módulos del plan</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 18 }}>
                  {MODULOS_TOGGLEABLES.map(m => {
                    const on = orgForm.modulos.includes(m.key)
                    return (
                      <button key={m.key} type="button" onClick={() => toggleModAdmin(m.key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "8px 10px", border: `1px solid ${on ? "#6f7d49" : "#e2e8f0"}`, background: on ? "#f4f2e6" : "white", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#1d1b12" }}>
                        {m.label}<span>{on ? "✓" : ""}</span>
                      </button>
                    )
                  })}
                </div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Precio mensual de este cliente</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "#64748b", fontSize: 14 }}>$</span>
                  <input type="number" value={orgForm.precio} onChange={e => setOrgForm(f => ({ ...f, precio: e.target.value }))}
                    placeholder={`Por defecto del plan (${RUBROS.find(r => r.key === orgForm.rubro)?.label || orgForm.rubro})`}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#1d1b12", background: "white", boxSizing: "border-box" }} />
                </div>
                <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "0 0 18px" }}>Dejalo vacío para usar el precio del plan. Si ponés un número, pisa el precio (ideal para Personalizado).</p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button onClick={() => setEditor(null)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancelar</button>
                  <button onClick={guardarPlan} disabled={guardandoOrg} style={{ background: "#1d1b12", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, color: "white", cursor: guardandoOrg ? "wait" : "pointer" }}>{guardandoOrg ? "Guardando…" : "Guardar"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
