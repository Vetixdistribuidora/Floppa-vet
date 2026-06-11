"use client"

import "./globals.css"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { setEmpresa } from "@/lib/empresa"
import Logo from "@/components/Logo"
import { MODULOS, modulosActivos } from "@/lib/modulos"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<any>(null)
  const [orgNombre, setOrgNombre] = useState<string>("Floppa")
  const [modulos, setModulos] = useState<string[] | null>(null)
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const router = useRouter()
  // Refs para acceder siempre al valor actualizado dentro del callback (evitar stale closure)
  const usuarioIdRef = useRef<string | null>(null)
  const pathnameRef  = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  // Páginas públicas que NO requieren autenticación
  const RUTAS_PUBLICAS = ["/login", "/onboarding", "/registro"]

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        const { data: org } = await supabase.from("organizaciones").select("nombre, direccion, telefono, email, logo_url, modulos").maybeSingle()
        if (org) {
          setOrgNombre(org.nombre); setEmpresa(org); setModulos(org.modulos)
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
      background: active ? "#1f2937" : "transparent",
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
    if (pathname.startsWith("/pacientes")) return "Pacientes"
    if (pathname.startsWith("/consultas")) return "Consultas"
    if (pathname.startsWith("/recordatorios")) return "Recordatorios"
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
    if (pathname.startsWith("/pacientes")) return "🐾"
    if (pathname.startsWith("/consultas")) return "📋"
    if (pathname.startsWith("/recordatorios")) return "⏰"
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

  if (isLoginPage || isOnboarding || isRegistro) {
    return (
      <html lang="es">
        <head>
          <meta name="theme-color" content="#647a3e" />
          <link rel="manifest" href="/manifest.webmanifest" />
        </head>
        <body>
          {children}
        </body>
      </html>
    )
  }

  const SidebarContent = () => (
    <div style={{
      width: "230px",
      background: "#111",
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
            <Logo size={40} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: "800", fontSize: "15px", letterSpacing: "1px", color: "white", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{orgNombre}</div>
            <div style={{ fontSize: "9px", color: "#6f7d49", letterSpacing: "2px", marginTop: "3px", textTransform: "uppercase", fontWeight: "600" }}>Distribuidora</div>
          </div>
        </div>

        {/* NAV */}
        <nav>
          {MODULOS.filter(m => m.core || modulosActivos(modulos).includes(m.key)).map(m => {
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
      <div style={{ borderTop: "1px solid #1f2937", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
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
        <meta name="apple-mobile-web-app-title" content="Floppa" />
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
                <div style={{ fontWeight: "800", fontSize: "16px", color: "#0f172a", lineHeight: 1.2 }}>{getTitle()}</div>
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
          <div className="main-content" style={{ padding: "30px", overflowY: "auto", flex: 1, background: "#f1f5f9" }}>
            {children}
          </div>
        </main>

      </body>
    </html>
  )
}