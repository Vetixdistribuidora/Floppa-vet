"use client"

import "./globals.css"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { setEmpresa } from "@/lib/empresa"
import Logo from "@/components/Logo"
import { MODULOS, modulosActivos, modulosVisibles, RUBROS } from "@/lib/modulos"

// ── Paywall: ¿la suscripción de la organización está vencida? ────────────────
// Bloquea el acceso cuando la suscripción no está vigente. El owner de la
// plataforma (estado "owner") nunca se bloquea. Sin fila todavía (cuenta recién
// creada, antes del onboarding) tampoco bloquea.
function suscripcionVencida(s: { estado?: string; fecha_vencimiento?: string | null } | null): boolean {
  if (!s) return false
  if (s.estado === "owner") return false
  if (s.estado === "vencido") return true
  // trial o activo: vence al final del día de fecha_vencimiento
  if (s.fecha_vencimiento) {
    return new Date(s.fecha_vencimiento + "T23:59:59") < new Date()
  }
  return false
}

// Ordena los módulos del menú según la preferencia de la org (orden_modulos).
// Los que no estén en la lista quedan al final, en su orden por defecto.
function ordenarModulos<T extends { key: string }>(mods: T[], orden: string[] | null): T[] {
  if (!orden || !orden.length) return mods
  return [...mods].sort((a, b) => {
    const ia = orden.indexOf(a.key), ib = orden.indexOf(b.key)
    return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib)
  })
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<any>(null)
  const [orgNombre, setOrgNombre] = useState<string>("Flop")
  const [modulos, setModulos] = useState<string[] | null>(null)
  const [modulosRol, setModulosRol] = useState<Record<string, string[]>>({})
  const [rol, setRol] = useState<string>("admin")
  const [rubro, setRubro] = useState<string>("")
  const [rubroDisplay, setRubroDisplay] = useState<string>("")
  const [orden, setOrden] = useState<string[] | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [mostrarRubro, setMostrarRubro] = useState<boolean>(true)
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const [authListo, setAuthListo] = useState(false)
  const [suscripcion, setSuscripcion] = useState<{ estado?: string; fecha_vencimiento?: string | null } | null>(null)
  const router = useRouter()
  // Refs para acceder siempre al valor actualizado dentro del callback (evitar stale closure)
  const usuarioIdRef = useRef<string | null>(null)
  const pathnameRef  = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  // Páginas públicas que NO requieren autenticación
  const RUTAS_PUBLICAS = ["/login", "/onboarding", "/registro", "/terminos", "/privacidad"]

  useEffect(() => {
    // Garantizar que, apenas se restaura la sesión desde el almacenamiento, las
    // páginas ya puedan renderizar autenticadas (evita la carrera del arranque en frío).
    supabase.auth.getSession().then(() => setAuthListo(true))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthListo(true)
      if (event === "SIGNED_OUT") {
        usuarioIdRef.current = null
        setUsuario(null)
        router.replace("/login")
      } else if (event === "INITIAL_SESSION" && !session) {
        // Solo redirigir a /login si el usuario está intentando acceder a una ruta protegida
        if (!RUTAS_PUBLICAS.includes(pathnameRef.current)) {
          router.replace("/login")
        }
      } else if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        // Si es el mismo usuario (token refresh), no hacer nada para evitar re-renders
        if (usuarioIdRef.current === session.user.id) return
        usuarioIdRef.current = session.user.id
        setUsuario(session.user)
        const { data: org } = await supabase.from("organizaciones").select("id, nombre, direccion, telefono, email, logo_url, modulos, modulos_rol, rubro, mostrar_rubro, rubro_display, orden_modulos").maybeSingle()
        if (org) {
          setOrgNombre(org.nombre); setEmpresa(org); setModulos(org.modulos); setModulosRol(org.modulos_rol || {})
          setRubro(org.rubro || ""); setMostrarRubro(org.mostrar_rubro !== false)
          setRubroDisplay(org.rubro_display || ""); setOrden(Array.isArray(org.orden_modulos) ? org.orden_modulos : null)
          setLogoUrl(org.logo_url || null)
          const { data: ou } = await supabase.from("org_usuarios").select("rol").maybeSingle()
          setRol(ou?.rol || "admin")
          // Suscripción de la organización (para el paywall)
          const { data: susc } = await supabase.from("suscripciones")
            .select("estado, fecha_vencimiento").eq("organizacion_id", org.id).maybeSingle()
          setSuscripcion(susc)
        } else if (!RUTAS_PUBLICAS.includes(pathnameRef.current)) {
          // Usuario autenticado pero sin organización todavía → onboarding
          router.replace("/onboarding")
        }
      }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cerrar sidebar al navegar
  useEffect(() => { setSidebarAbierto(false) }, [pathname])

  const isLoginPage = pathname === "/login"
  const isOnboarding = pathname === "/onboarding"
  const isRegistro = pathname === "/registro"
  const isLegal = pathname === "/terminos" || pathname === "/privacidad"

  const getItemStyle = (path: string) => {
    const active = path === "/" ? pathname === "/" : pathname.startsWith(path)
    return {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 14px",
      borderRadius: "10px",
      textDecoration: "none",
      fontSize: "14px",
      marginBottom: "6px",
      transition: "all 0.2s ease",
      background: active ? "#2a2718" : "transparent",
      color: active ? "white" : "#9ca3af",
      borderLeft: active ? "3px solid #8a9a5b" : "3px solid transparent",
    }
  }

  const iconStyle = (color: string, active: boolean) => ({
    width: "18px",
    height: "18px",
    stroke: active ? color : "#6b7280",
  })

  const getTitle = () => {
    if (pathname === "/") return "Inicio"
    if (pathname.startsWith("/productos")) return "Productos"
    if (pathname.startsWith("/clientes")) return "Clientes"
    if (pathname.startsWith("/sala")) return "Sala de espera"
    if (pathname.startsWith("/turnos")) return "Turnos"
    if (pathname.startsWith("/internacion")) return "Internación"
    if (pathname.startsWith("/tutores")) return "Tutores"
    if (pathname.startsWith("/pacientes")) return "Pacientes"
    if (pathname.startsWith("/consultas")) return "Historia Clínica"
    if (pathname.startsWith("/estudios")) return "Estudios"
    if (pathname.startsWith("/recordatorios")) return "Sanidad"
    if (pathname.startsWith("/cobros")) return "Pre Venta"
    if (pathname.startsWith("/ventas")) return "Ventas"
    if (pathname.startsWith("/proveedores")) return "Proveedores"
    if (pathname.startsWith("/compras")) return "Compras"
    if (pathname.startsWith("/cuentas")) return "Cuenta Corriente"
    if (pathname.startsWith("/caja")) return "Caja"
    if (pathname.startsWith("/reportes")) return "Reportes"
    if (pathname.startsWith("/deudores")) return "Deudores"
    if (pathname.startsWith("/tienda-online")) return "Tienda Online"
    if (pathname.startsWith("/pedidos")) return "Pedidos"
    if (pathname.startsWith("/cheques")) return "Cheques"
    if (pathname.startsWith("/mermas")) return "Mermas"
    if (pathname.startsWith("/configuracion")) return "Configuración"
    if (pathname.startsWith("/admin")) return "Panel Admin"
    return ""
  }

  const getPageIcon = () => {
    if (pathname === "/") return "🏠"
    if (pathname.startsWith("/productos")) return "📦"
    if (pathname.startsWith("/clientes")) return "👤"
    if (pathname.startsWith("/sala")) return "🪑"
    if (pathname.startsWith("/turnos")) return "📅"
    if (pathname.startsWith("/internacion")) return "🏥"
    if (pathname.startsWith("/tutores")) return "👥"
    if (pathname.startsWith("/pacientes")) return "🐾"
    if (pathname.startsWith("/consultas")) return "📋"
    if (pathname.startsWith("/estudios")) return "📎"
    if (pathname.startsWith("/recordatorios")) return "💉"
    if (pathname.startsWith("/cobros")) return "💲"
    if (pathname.startsWith("/ventas")) return "🛒"
    if (pathname.startsWith("/proveedores")) return "🚚"
    if (pathname.startsWith("/compras")) return "🧾"
    if (pathname.startsWith("/cuentas")) return "📄"
    if (pathname.startsWith("/caja")) return "💵"
    if (pathname.startsWith("/reportes")) return "📊"
    if (pathname.startsWith("/deudores")) return "⚠️"
    if (pathname.startsWith("/tienda-online")) return "🛍️"
    if (pathname.startsWith("/pedidos")) return "📋"
    if (pathname.startsWith("/cheques")) return "🏦"
    if (pathname.startsWith("/mermas")) return "📉"
    if (pathname.startsWith("/configuracion")) return "⚙️"
    if (pathname.startsWith("/admin")) return "⭐"
    return ""
  }

  const inicialAvatar = usuario?.email?.charAt(0).toUpperCase() ?? "?"
  const emailCorto = usuario?.email ?? ""

  const [hayActualizacion, setHayActualizacion] = useState(false)
  const [sinRed, setSinRed] = useState(false)

  // ── Monitor de red offline ─────────────────────────────────────────────────
  useEffect(() => {
    const online  = () => setSinRed(false)
    const offline = () => setSinRed(true)
    window.addEventListener("online",  online)
    window.addEventListener("offline", offline)
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline) }
  }, [])

  // ── Service Worker: registrar y detectar nuevas versiones ──────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => {
        // Cuando el SW encuentra una nueva versión
        reg.addEventListener("updatefound", () => {
          const nuevoSW = reg.installing
          if (!nuevoSW) return
          nuevoSW.addEventListener("statechange", () => {
            if (nuevoSW.state === "installed" && navigator.serviceWorker.controller) {
              // Hay una nueva versión lista — activarla y recargar
              nuevoSW.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })
        // Revisar si ya hay un SW esperando (caso: página abierta cuando deployaron)
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" })
        }
        // Buscar actualización cada vez que el usuario abre la app
        reg.update().catch(() => {})
      })
      .catch(() => {})

    // Cuando el SW nuevo se activa, el mensaje SW_UPDATED muestra el banner
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "SW_UPDATED") {
        setHayActualizacion(true)
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])

  // ── Refresh proactivo cada 10 minutos ────────────────────────────────────
  // Evita que el token expire silenciosamente mientras el usuario trabaja despacio
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        // Si le quedan menos de 15 minutos de vida, forzar refresh ahora
        const expiresAt = session.expires_at ?? 0
        const ahoraEnSeg = Math.floor(Date.now() / 1000)
        if (expiresAt - ahoraEnSeg < 900) {
          await supabase.auth.refreshSession()
        }
      } catch { /* silencioso — el token refresh tiene su propio manejo de errores */ }
    }, 10 * 60 * 1000) // cada 10 minutos
    return () => clearInterval(interval)
  }, [])

  // Nota: el handler de visibilityChange fue eliminado porque refreshSession()
  // al volver a la pestaña causaba que las páginas quedaran en loading state.
  // La sesión se mantiene activa con el refresh proactivo cada 10min + JWT de 8h.

  if (isLoginPage || isOnboarding || isRegistro || isLegal) {
    return (
      <html lang="es">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#647a3e" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <link rel="manifest" href="/manifest.webmanifest" />
        </head>
        <body>
          {children}
        </body>
      </html>
    )
  }

  // Ruta protegida: esperar a que la sesión se restaure antes de montar la página
  // (así ninguna pantalla consulta sin auth y entra bien la primera vez).
  if (!authListo) {
    return (
      <html lang="es">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#647a3e" />
          <link rel="manifest" href="/manifest.webmanifest" />
        </head>
        <body style={{ margin: 0, background: "#14130d", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ filter: "drop-shadow(0 6px 18px rgba(80,96,55,0.45))" }}><Logo size={52} /></div>
            <div style={{ color: "#8a9a5b", fontFamily: "DM Sans, sans-serif", fontSize: 13, letterSpacing: 1 }}>Cargando…</div>
          </div>
        </body>
      </html>
    )
  }

  const SidebarContent = () => (
    <div style={{
      width: "230px",
      background: "#14130d",
      color: "white",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div style={{ padding: "20px", flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* LOGO */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flexShrink: 0, filter: "drop-shadow(0 4px 12px rgba(80,96,55,0.4))" }}>
            {logoUrl
              ? <img src={logoUrl} alt="" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 10, background: "white", padding: 2 }} />
              : <Logo size={40} />}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: "800", fontSize: "15px", letterSpacing: "1px", color: "white", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{orgNombre}</div>
            {mostrarRubro && rubro && (
              <div style={{ fontSize: "9px", color: "#6f7d49", letterSpacing: "2px", marginTop: "3px", textTransform: "uppercase", fontWeight: "600" }}>{RUBROS.find(r => r.key === (rubroDisplay || rubro))?.label || rubroDisplay || rubro}</div>
            )}
          </div>
        </div>

        {/* NAV */}
        <nav>
          {ordenarModulos(MODULOS.filter(m => m.core || modulosVisibles(rol, modulosActivos(modulos), modulosRol).includes(m.key)), orden).map(m => {
            const active = m.path === "/" ? pathname === "/" : pathname.startsWith(m.path)
            return (
              <Link key={m.key} href={m.path} style={getItemStyle(m.path)} onClick={() => setSidebarAbierto(false)}>
                <svg style={iconStyle(m.color, active)} fill="none" strokeWidth="2" viewBox="0 0 24 24">{m.icon}</svg>
                {m.label}
              </Link>
            )
          })}
          <Link href="/configuracion" style={getItemStyle("/configuracion")} onClick={() => setSidebarAbierto(false)}>
            <svg style={iconStyle("#94a3b8", pathname.startsWith("/configuracion"))} fill="none" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Configuración
          </Link>
          {usuario?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL && (
            <Link href="/admin" style={getItemStyle("/admin")} onClick={() => setSidebarAbierto(false)}>
              <svg style={iconStyle("#f59e0b", pathname.startsWith("/admin"))} fill="none" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Admin
            </Link>
          )}
        </nav>
      </div>

      {/* USER SECTION */}
      <div style={{ borderTop: "1px solid #2a2718", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "50%",
          background: "linear-gradient(135deg, #6f7d49, #4b5a2c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", fontWeight: "700", color: "white", flexShrink: 0,
        }}>
          {inicialAvatar}
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {emailCorto}
          </div>
          <div style={{ fontSize: "10px", color: "#4ade80", marginTop: "1px" }}>● Activo</div>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); setUsuario(null); router.replace("/login") }}
          title="Cerrar sesión"
          style={{ background: "transparent", border: "1px solid #374151", color: "#9ca3af", cursor: "pointer", fontSize: "11px", borderRadius: "6px", padding: "4px 8px", flexShrink: 0 }}>
          Salir
        </button>
      </div>
    </div>
  )

  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#647a3e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Flop" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/api/icon-192" />
        <style>{`
          @media (max-width: 768px) {
            .desktop-sidebar { display: none !important; }
            .mobile-overlay { display: flex !important; }
            .main-content { padding: 16px !important; }
            .header-date { display: none !important; }
          }
          @media (min-width: 769px) {
            .mobile-hamburger { display: none !important; }
            .mobile-overlay { display: none !important; }
          }
        `}</style>
      </head>
      <body style={{ display: "flex" }}>

        {/* SIDEBAR desktop — fijo */}
        <aside className="desktop-sidebar" style={{ position: "sticky", top: 0, height: "100vh" }}>
          <SidebarContent />
        </aside>

        {/* OVERLAY mobile */}
        <div className="mobile-overlay" style={{
          display: "none",
          position: "fixed", inset: 0, zIndex: 100,
          pointerEvents: sidebarAbierto ? "auto" : "none",
        }}>
          {/* Backdrop */}
          {sidebarAbierto && (
            <div onClick={() => setSidebarAbierto(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100 }} />
          )}
          {/* Drawer */}
          <div style={{
            position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 101,
            transform: sidebarAbierto ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          }}>
            <SidebarContent />
          </div>
        </div>

        {/* MAIN */}
        <main style={{ flex: 1, height: "100vh", display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* HEADER */}
          <div style={{
            background: "white", padding: "0 28px",
            borderBottom: "1px solid #e2e8f0", height: "60px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Hamburger — solo mobile */}
              <button
                className="mobile-hamburger"
                onClick={() => setSidebarAbierto(!sidebarAbierto)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ display: "block", width: 22, height: 2, background: "#374151", borderRadius: 2 }} />
                <span style={{ display: "block", width: 22, height: 2, background: "#374151", borderRadius: 2 }} />
                <span style={{ display: "block", width: 22, height: 2, background: "#374151", borderRadius: 2 }} />
              </button>

              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #4b5a2c, #6f7d49)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", boxShadow: "0 2px 8px rgba(80,96,55,0.35)"
              }}>
                {getPageIcon()}
              </div>
              <div>
                <div style={{ fontWeight: "800", fontSize: "16px", color: "#1d1b12", lineHeight: 1.2 }}>{getTitle()}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontWeight: 500 }}>{orgNombre}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="header-date" style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
                {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <button
                onClick={() => window.location.reload()}
                title="Actualizar app"
                style={{
                  background: hayActualizacion ? "linear-gradient(135deg,#4b5a2c,#6f7d49)" : "none",
                  border: hayActualizacion ? "none" : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: hayActualizacion ? "0 12px" : "0",
                  width: hayActualizacion ? "auto" : 34, height: 34,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  cursor: "pointer", flexShrink: 0,
                  color: hayActualizacion ? "white" : "#94a3b8",
                  fontSize: hayActualizacion ? 12 : 16,
                  fontWeight: hayActualizacion ? 700 : undefined,
                  transition: "all 0.2s",
                }}
              >
                🔄{hayActualizacion && " Nueva versión"}
              </button>
            </div>
          </div>

          {/* BANNER SIN RED */}
          {sinRed && (
            <div style={{
              background: "#dc2626", color: "white", fontSize: 13, fontWeight: 700,
              textAlign: "center", padding: "8px 16px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              ⚠️ Sin conexión a internet — las acciones no se guardarán hasta recuperar la red
            </div>
          )}

          {/* CONTENT */}
          <div className="main-content" style={{ padding: "30px", overflowY: "auto", flex: 1, background: "#f5f2e8" }}>
            {suscripcionVencida(suscripcion) && !pathname.startsWith("/configuracion")
              ? <PaywallBloqueo onIr={() => router.push("/configuracion")} />
              : children}
          </div>
        </main>

      </body>
    </html>
  )
}

// Pantalla que reemplaza el contenido cuando la suscripción venció.
function PaywallBloqueo({ onIr }: { onIr: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{
        maxWidth: 460, width: "100%", textAlign: "center",
        background: "white", border: "1px solid #e7e1cf", borderRadius: 18,
        padding: "44px 36px", boxShadow: "0 12px 40px rgba(20,19,13,0.08)",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: "#1d1b12", marginBottom: 10 }}>
          Tu suscripción venció
        </div>
        <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 28 }}>
          Para seguir usando Flop, reactivá tu suscripción desde Configuración.
          Tus datos están a salvo y vuelven apenas reactivás.
        </div>
        <button
          onClick={onIr}
          style={{
            background: "linear-gradient(135deg,#4b5a2c,#6f7d49)", color: "white",
            border: "none", borderRadius: 12, padding: "13px 28px",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(80,96,55,0.35)",
          }}>
          Ir a Configuración para reactivar
        </button>
      </div>
    </div>
  )
}