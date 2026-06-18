"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { setEmpresa } from "@/lib/empresa"
import Logo from "@/components/Logo"
import { MODULOS, modulosActivos, ROLES_CONFIGURABLES, RUBROS } from "@/lib/modulos"

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR")
}

function fechaLocal(f: string | null | undefined) {
  if (!f) return ""
  return new Date(f + "T00:00:00").toLocaleDateString("es-AR")
}

export default function ConfiguracionPage() {
  const [suscripcion, setSuscripcion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creandoLink, setCreandoLink] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<any>(null)
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [nombreEdit, setNombreEdit] = useState("")
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [org, setOrg] = useState<any>(null)
  const [empresaForm, setEmpresaForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" })
  const [mostrarRubroSel, setMostrarRubroSel] = useState(true)
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false)
  const [empresaGuardada, setEmpresaGuardada] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [inviteForm, setInviteForm] = useState({ email: "", password: "", rol: "recepcion" })
  const [invitando, setInvitando] = useState(false)
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null)
  const [modulosRolSel, setModulosRolSel] = useState<Record<string, string[]>>({})
  const [guardandoPermisos, setGuardandoPermisos] = useState(false)
  const [permisosGuardados, setPermisosGuardados] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUsuario(user)
    if (!user?.email) { setLoading(false); return }

    const { data } = await supabase
      .from("suscripciones")
      .select("*, planes(nombre, precio)")
      .eq("email", user.email)
      .maybeSingle()

    // Si no tiene fila todavía → crear trial automáticamente (15 días)
    if (!data) {
      const venc = new Date(); venc.setDate(venc.getDate() + 15)
      const { data: nuevo } = await supabase
        .from("suscripciones")
        .insert({
          email: user.email,
          nombre_negocio: "",
          estado: "trial",
          plan_id: 1,
          fecha_inicio: new Date().toISOString().split("T")[0],
          fecha_vencimiento: venc.toISOString().split("T")[0],
        })
        .select("*, planes(nombre, precio)")
        .single()
      setSuscripcion(nuevo)
      setNombreEdit(nuevo?.nombre_negocio || "")
    } else {
      setSuscripcion(data)
      setNombreEdit(data?.nombre_negocio || "")
    }

    // Datos de la organización
    const { data: orgData } = await supabase.from("organizaciones").select("*").single()
    if (orgData) {
      setOrg(orgData)
      setEmpresaForm({
        nombre: orgData.nombre || "",
        direccion: orgData.direccion || "",
        telefono: orgData.telefono || "",
        email: orgData.email || "",
      })
      setModulosRolSel(orgData.modulos_rol || {})
      setMostrarRubroSel(orgData.mostrar_rubro !== false)
    }
    // Rol del usuario actual + equipo
    const { data: miOu } = await supabase.from("org_usuarios").select("rol").eq("user_id", user.id).maybeSingle()
    setEsAdmin((miOu?.rol || "admin") === "admin")
    cargarUsuarios()
    setLoading(false)
  }

  async function cargarUsuarios() {
    const { data } = await supabase.from("org_usuarios").select("user_id, rol, email").order("rol")
    setUsuarios(data || [])
  }
  async function invitarUsuario() {
    if (!inviteForm.email.trim() || inviteForm.password.length < 6) { setErrorUsuario("Email y contraseña (mín. 6 caracteres)"); return }
    setInvitando(true); setErrorUsuario(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/usuarios", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(inviteForm) })
    const j = await res.json(); setInvitando(false)
    if (!res.ok) { setErrorUsuario(j.error || "Error"); return }
    setInviteForm({ email: "", password: "", rol: "recepcion" }); cargarUsuarios()
  }
  async function quitarUsuario(u: any) {
    if (!confirm(`¿Quitar el acceso de ${u.email}?`)) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/usuarios", { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ user_id: u.user_id }) })
    if (res.ok) cargarUsuarios()
  }
  const rolModulos = (rol: string) => modulosRolSel[rol] ?? modulosActivos(org?.modulos)
  function toggleRolModulo(rol: string, key: string) {
    const actual = rolModulos(rol)
    setModulosRolSel(prev => ({ ...prev, [rol]: actual.includes(key) ? actual.filter(k => k !== key) : [...actual, key] }))
  }
  async function guardarPermisos() {
    if (!org) return
    setGuardandoPermisos(true)
    const payload: Record<string, string[]> = { ...modulosRolSel }
    for (const r of ROLES_CONFIGURABLES) if (!payload[r.key]) payload[r.key] = modulosActivos(org.modulos)
    await supabase.from("organizaciones").update({ modulos_rol: payload }).eq("id", org.id)
    setModulosRolSel(payload)
    setGuardandoPermisos(false); setPermisosGuardados(true); setTimeout(() => setPermisosGuardados(false), 2500)
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !org) return
    e.target.value = ""
    setSubiendoLogo(true)
    const ext = file.name.split(".").pop()
    const path = `${org.id}.${ext}`
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true })
    if (upErr) { setError("No se pudo subir el logo: " + upErr.message); setSubiendoLogo(false); return }
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
    const url = urlData.publicUrl + "?t=" + Date.now()
    await supabase.from("organizaciones").update({ logo_url: url }).eq("id", org.id)
    const next = { ...org, logo_url: url }
    setOrg(next); setEmpresa({ nombre: next.nombre, direccion: next.direccion, telefono: next.telefono, email: next.email, logo_url: url })
    setSubiendoLogo(false)
  }
  async function quitarLogo() {
    if (!org) return
    setSubiendoLogo(true)
    await supabase.from("organizaciones").update({ logo_url: null }).eq("id", org.id)
    const next = { ...org, logo_url: null }
    setOrg(next); setEmpresa({ nombre: next.nombre, direccion: next.direccion, telefono: next.telefono, email: next.email, logo_url: null })
    setSubiendoLogo(false)
  }

  async function guardarEmpresa() {
    if (!org) return
    setGuardandoEmpresa(true)
    const payload = {
      nombre: empresaForm.nombre,
      direccion: empresaForm.direccion,
      telefono: empresaForm.telefono,
      email: empresaForm.email,
      mostrar_rubro: mostrarRubroSel,
    }
    await supabase.from("organizaciones").update(payload).eq("id", org.id)
    setOrg({ ...org, ...payload })
    setEmpresa({ ...payload, logo_url: org.logo_url })
    setGuardandoEmpresa(false)
    setEmpresaGuardada(true)
    setTimeout(() => setEmpresaGuardada(false), 2500)
  }

  async function iniciarSuscripcion() {
    if (!usuario) return
    setCreandoLink(true)
    setError(null)
    try {
      const res = await fetch("/api/mp/crear-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: usuario.email,
          nombre_negocio: suscripcion?.nombre_negocio || "",
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      window.location.href = data.init_point
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreandoLink(false)
    }
  }

  async function guardarNombre() {
    if (!usuario) return
    setGuardandoNombre(true)
    await supabase
      .from("suscripciones")
      .update({ nombre_negocio: nombreEdit })
      .eq("email", usuario.email)
    setSuscripcion((prev: any) => ({ ...prev, nombre_negocio: nombreEdit }))
    setGuardandoNombre(false)
    setEditandoNombre(false)
  }

  const estadoConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    owner:   { label: "Owner — Acceso ilimitado", color: "#4ade80", bg: "rgba(74,222,128,0.12)",   icon: "👑" },
    activo:  { label: "Activo",                   color: "#4ade80", bg: "rgba(74,222,128,0.12)",   icon: "✅" },
    trial:   { label: "Período de prueba",         color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "⏳" },
    vencido: { label: "Suscripción vencida",       color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "❌" },
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <p style={{ color: "#9ca3af" }}>Cargando...</p>
    </div>
  )

  const est = estadoConfig[suscripcion?.estado || "trial"]
  const esOwner = suscripcion?.estado === "owner"

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {/* ── Suscripción ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "#1d1b12", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "28px 28px", marginBottom: 20,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: "white", fontSize: 17, fontWeight: 700 }}>💳 Suscripción</h2>
          <span style={{
            background: est.bg, color: est.color,
            fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
          }}>
            {est.icon} {est.label}
          </span>
        </div>

        {/* Nombre del negocio */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
            Nombre del negocio
          </div>
          {editandoNombre ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={nombreEdit}
                onChange={e => setNombreEdit(e.target.value)}
                style={{
                  flex: 1, padding: "9px 12px", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                  color: "white", fontSize: 14, outline: "none",
                }}
                onKeyDown={e => e.key === "Enter" && guardarNombre()}
                autoFocus
              />
              <button
                onClick={guardarNombre}
                disabled={guardandoNombre}
                style={{ padding: "9px 16px", background: "#6f7d49", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {guardandoNombre ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => { setEditandoNombre(false); setNombreEdit(suscripcion?.nombre_negocio || "") }}
                style={{ padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "white", fontSize: 15, fontWeight: 600 }}>
                {suscripcion?.nombre_negocio || <span style={{ color: "#4b5563", fontStyle: "italic" }}>Sin nombre</span>}
              </span>
              <button
                onClick={() => setEditandoNombre(true)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#9ca3af", fontSize: 11, padding: "3px 8px", cursor: "pointer" }}>
                Editar
              </button>
            </div>
          )}
        </div>

        {/* Info plan */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Plan</div>
            <div style={{ color: "white", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              {esOwner ? "Owner" : (suscripcion?.planes?.nombre || "Mensual")}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Precio</div>
            <div style={{ color: "white", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              {esOwner ? "Gratis" : fmt(suscripcion?.planes?.precio || 60000) + "/mes"}
            </div>
          </div>
          {suscripcion?.fecha_vencimiento && !esOwner && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {suscripcion.estado === "activo" ? "Próximo pago" : "Vence"}
              </div>
              <div style={{ color: "white", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                {fechaLocal(suscripcion.fecha_vencimiento)}
              </div>
            </div>
          )}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</div>
            <div style={{ color: "white", fontSize: 13, fontWeight: 600, marginTop: 4, wordBreak: "break-all" }}>
              {usuario?.email}
            </div>
          </div>
        </div>

        {/* Acciones según estado */}
        {!esOwner && suscripcion?.estado !== "activo" && (
          <div>
            {suscripcion?.estado === "vencido" && (
              <div style={{
                background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                color: "#fca5a5", fontSize: 13,
              }}>
                ⚠️ Tu suscripción venció. Reactivala para seguir usando el sistema.
              </div>
            )}
            {suscripcion?.estado === "trial" && (
              <div style={{
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                color: "#fde68a", fontSize: 13,
              }}>
                ⏳ Estás en período de prueba
                {suscripcion?.fecha_vencimiento ? ` — vence el ${fechaLocal(suscripcion.fecha_vencimiento)}` : ""}.
                Activá tu suscripción para no perder el acceso.
              </div>
            )}

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                color: "#fca5a5", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={iniciarSuscripcion}
              disabled={creandoLink}
              style={{
                width: "100%", padding: "13px",
                background: creandoLink ? "rgba(111,125,73,0.5)" : "linear-gradient(135deg, #5b6b34, #6f7d49)",
                border: "none", borderRadius: 10, color: "white",
                fontSize: 14, fontWeight: 700, cursor: creandoLink ? "not-allowed" : "pointer",
                boxShadow: creandoLink ? "none" : "0 4px 16px rgba(111,125,73,0.35)",
                transition: "all 0.2s",
              }}>
              {creandoLink ? "Generando link de pago..." : "💳 Activar suscripción con MercadoPago"}
            </button>
          </div>
        )}

        {suscripcion?.estado === "activo" && (
          <div style={{ color: "#4ade80", fontSize: 13 }}>
            ✅ Suscripción activa. Los pagos se renuevan automáticamente cada mes.
          </div>
        )}

        {esOwner && (
          <div style={{ color: "#4ade80", fontSize: 13 }}>
            👑 Cuenta owner — acceso ilimitado sin costo.
          </div>
        )}
      </div>

      {/* ── Usuarios del equipo (solo el dueño/admin) ────────────────────────── */}
      {esAdmin && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 20, padding: "24px 28px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 4px", color: "#1d1b12", fontSize: 17, fontWeight: 700 }}>👥 Usuarios del equipo</h2>
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>Creá accesos para tus empleados. Cada uno entra con su email y ve solo lo de su rol.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {usuarios.map(u => (
              <div key={u.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1d1b12", fontSize: 13.5 }}>{u.email || "(sin email)"}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>{u.rol === "admin" ? "👑 Dueño / Admin" : u.rol === "veterinario" ? "🩺 Veterinario/a" : "🧑‍💼 Recepción"}</div>
                </div>
                {u.rol !== "admin" && <button onClick={() => quitarUsuario(u)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Quitar</button>}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>+ Nuevo usuario</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
              <input value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="Email" style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", background: "white", outline: "none", boxSizing: "border-box" }} />
              <input value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Contraseña (mín. 6)" style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", background: "white", outline: "none", boxSizing: "border-box" }} />
              <select value={inviteForm.rol} onChange={e => setInviteForm({ ...inviteForm, rol: e.target.value })} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1d1b12", background: "white", outline: "none", boxSizing: "border-box" }}>
                <option value="recepcion">Recepción</option>
                <option value="veterinario">Veterinario/a</option>
              </select>
            </div>
            {errorUsuario && <div style={{ color: "#dc2626", fontSize: 12.5, marginTop: 8 }}>{errorUsuario}</div>}
            <button onClick={invitarUsuario} disabled={invitando} style={{ marginTop: 12, padding: "10px 20px", background: "#1d1b12", border: "none", borderRadius: 9, color: "white", fontSize: 13, fontWeight: 700, cursor: invitando ? "wait" : "pointer" }}>{invitando ? "Creando…" : "Crear usuario"}</button>
          </div>
        </div>
      )}

      {/* ── Permisos por rol ─────────────────────────────────────────────────── */}
      {esAdmin && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 20, padding: "24px 28px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 4px", color: "#1d1b12", fontSize: 17, fontWeight: 700 }}>🔐 Qué ve cada rol</h2>
          <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>Dentro de los módulos de tu plan, elegí qué pestañas ve cada rol. El dueño ve todo.</p>

          {ROLES_CONFIGURABLES.map(r => (
            <div key={r.key} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1b12", marginBottom: 8 }}>{r.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {modulosActivos(org?.modulos).map(key => {
                  const m = MODULOS.find(x => x.key === key)
                  const on = rolModulos(r.key).includes(key)
                  return (
                    <button key={key} type="button" onClick={() => toggleRolModulo(r.key, key)}
                      style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700, border: on ? "1.5px solid #6f7d49" : "1px solid #e2e8f0", background: on ? "#f4f2e6" : "white", color: on ? "#4b5a2c" : "#94a3b8" }}>
                      {on ? "✓ " : ""}{m?.label || key}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <button onClick={guardarPermisos} disabled={guardandoPermisos} style={{ padding: "11px 20px", background: permisosGuardados ? "#16a34a" : "#1d1b12", border: "none", borderRadius: 9, color: "white", fontSize: 13, fontWeight: 700, cursor: guardandoPermisos ? "not-allowed" : "pointer" }}>
            {guardandoPermisos ? "Guardando…" : permisosGuardados ? "✓ Guardado" : "Guardar permisos"}
          </button>
        </div>
      )}

      {/* ── Datos para comprobantes ──────────────────────────────────────────── */}
      <div style={{
        background: "white", border: "1px solid #e2e8f0",
        borderRadius: 20, padding: "24px 28px", marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ margin: "0 0 4px", color: "#1d1b12", fontSize: 17, fontWeight: 700 }}>🧾 Datos para comprobantes</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>
          Aparecen en el encabezado y pie de los presupuestos, recibos y notas de crédito.
        </p>

        {/* Logo del negocio */}
        <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" style={{ display: "none" }} onChange={subirLogo} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#faf9f1" }}>
          <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {org?.logo_url ? <img src={org.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Logo size={44} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1b12" }}>Logo del negocio</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {org?.logo_url ? "Se usa en todos los comprobantes." : "Si no subís uno, los comprobantes usan el logo de Floppa con tu nombre."}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => logoInputRef.current?.click()} disabled={subiendoLogo}
                style={{ background: "#0f172a", border: "none", borderRadius: 8, color: "white", padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: subiendoLogo ? "wait" : "pointer" }}>
                {subiendoLogo ? "Subiendo…" : org?.logo_url ? "Cambiar logo" : "Subir logo"}
              </button>
              {org?.logo_url && (
                <button onClick={quitarLogo} disabled={subiendoLogo}
                  style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, color: "#dc2626", padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
        {[
          { k: "nombre",    label: "Nombre / Razón social", ph: "Ej: Distribuidora Pérez" },
          { k: "direccion", label: "Dirección",             ph: "Ej: Av. San Martín 1234" },
          { k: "telefono",  label: "Teléfono",              ph: "Ej: 2604000000" },
          { k: "email",     label: "Email",                 ph: "Ej: contacto@tunegocio.com" },
        ].map(f => (
          <div key={f.k} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>
              {f.label}
            </label>
            <input
              value={(empresaForm as any)[f.k]}
              onChange={e => setEmpresaForm(prev => ({ ...prev, [f.k]: e.target.value }))}
              placeholder={f.ph}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#1d1b12", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={mostrarRubroSel} onChange={e => setMostrarRubroSel(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#6f7d49", cursor: "pointer" }} />
          <span style={{ fontSize: 13, color: "#334155" }}>
            Mostrar el rubro{org?.rubro ? ` («${RUBROS.find(r => r.key === org.rubro)?.label || org.rubro}»)` : ""} debajo del nombre en el menú
          </span>
        </label>
        <button
          onClick={guardarEmpresa}
          disabled={guardandoEmpresa}
          style={{
            marginTop: 8, padding: "11px 20px",
            background: empresaGuardada ? "#16a34a" : "#1d1b12",
            border: "none", borderRadius: 9, color: "white",
            fontSize: 13, fontWeight: 700, cursor: guardandoEmpresa ? "not-allowed" : "pointer",
          }}>
          {guardandoEmpresa ? "Guardando..." : empresaGuardada ? "✓ Guardado" : "Guardar datos"}
        </button>
      </div>

      {/* ── Cuenta ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: "white", border: "1px solid #e2e8f0",
        borderRadius: 20, padding: "24px 28px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ margin: "0 0 16px", color: "#1d1b12", fontSize: 17, fontWeight: 700 }}>⚙️ Cuenta</h2>
        <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>Email:</span> {usuario?.email}
        </div>
        <div style={{ fontSize: 13, color: "#374151" }}>
          <span style={{ fontWeight: 600 }}>ID:</span>{" "}
          <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>{usuario?.id}</span>
        </div>
      </div>

    </div>
  )
}
