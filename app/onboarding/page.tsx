"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Logo from "@/components/Logo"
import { RUBROS, PRESETS_RUBRO, DEFAULT_MODULOS, MODULOS } from "@/lib/modulos"

export default function OnboardingPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [rubro, setRubro] = useState("distribuidora")
  const [planes, setPlanes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Prefill del nombre que vino del registro
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.nombre_negocio
      if (n) setNombre(n)
    })
    // Precios por rubro
    supabase.from("planes").select("id, rubro, precio").eq("activo", true).then(({ data }) => {
      if (data) setPlanes(data)
    })
  }, [])

  const precioDe = (r: string) => {
    if (r === "personalizado") return "A convenir"
    const p = planes.find(x => x.rubro === r)
    return p ? "$" + Math.round(Number(p.precio)).toLocaleString("es-AR") + "/mes" : ""
  }

  // Módulos (con su nombre lindo) que incluye cada rubro, para mostrar "qué aporta el plan"
  const incluyeDe = (r: string) =>
    (PRESETS_RUBRO[r] || []).map(k => MODULOS.find(m => m.key === k)?.label || k)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError("Ingresá el nombre de tu negocio."); return }
    setLoading(true)
    setError(null)

    const { data: orgId, error: rpcError } = await supabase.rpc("crear_organizacion", { p_nombre: nombre.trim() })
    if (rpcError) {
      setError("Error al crear la organización: " + rpcError.message)
      setLoading(false)
      return
    }

    // Asignar rubro + módulos del preset elegido
    const modulos = PRESETS_RUBRO[rubro] || DEFAULT_MODULOS
    await supabase.from("organizaciones").update({ rubro, modulos }).eq("id", orgId)

    // Suscripción trial (15 días) con el plan del rubro
    const planId = planes.find(p => p.rubro === rubro)?.id ?? 1
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const venc = new Date(); venc.setDate(venc.getDate() + 15)
      await supabase.from("suscripciones").upsert({
        email: user.email,
        nombre_negocio: nombre.trim(),
        estado: "trial",
        plan_id: planId,
        organizacion_id: orgId,
        fecha_inicio: new Date().toISOString().split("T")[0],
        fecha_vencimiento: venc.toISOString().split("T")[0],
      }, { onConflict: "email" })
    }

    router.replace("/")
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #14130d 0%, #1d1b12 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "DM Sans, Segoe UI, sans-serif"
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "44px 40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, filter: "drop-shadow(0 6px 18px rgba(80,96,55,0.45))" }}>
            <Logo size={56} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "white", letterSpacing: 2 }}>¡Bienvenido!</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>
            Configurá tu negocio para empezar a usar Flop
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nombre */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
              Nombre del negocio
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Distribuidora San Martín"
              autoFocus
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "white", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit"
              }}
            />
          </div>

          {/* Rubro */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" }}>
              ¿Qué tipo de negocio tenés?
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RUBROS.map(r => {
                const sel = rubro === r.key
                const mods = incluyeDe(r.key)
                return (
                  <button
                    key={r.key} type="button" onClick={() => setRubro(r.key)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "stretch",
                      padding: 0, borderRadius: 12, cursor: "pointer", textAlign: "left", overflow: "hidden",
                      background: sel ? "rgba(138,154,91,0.14)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${sel ? "#8a9a5b" : "rgba(255,255,255,0.1)"}`,
                      transition: "all .15s",
                    }}>
                    {/* Fila principal: rubro + precio */}
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 16px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${sel ? "#8a9a5b" : "#4b5563"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {sel && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#8a9a5b" }} />}
                        </span>
                        <span style={{ color: "white", fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                      </span>
                      <span style={{ color: sel ? "#a8b67d" : "#6b7280", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {precioDe(r.key)}
                      </span>
                    </span>
                    {/* Detalle "qué incluye" — al seleccionar el rubro */}
                    {sel && (
                      <span style={{ display: "block", padding: "12px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        {r.key === "personalizado" ? (
                          <span style={{ display: "block", fontSize: 12.5, color: "#a8b67d", lineHeight: 1.5 }}>
                            Plan a medida: arrancás con lo esencial (productos, ventas, caja) y habilitamos los módulos que necesites. Te pasamos el precio según lo que armemos.
                          </span>
                        ) : (
                          <>
                            <span style={{ display: "block", fontSize: 10.5, color: "#7e8a5e", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Incluye</span>
                            <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {mods.map(m => (
                                <span key={m} style={{ fontSize: 11.5, color: "#d7e0bf", background: "rgba(138,154,91,0.16)", border: "1px solid rgba(138,154,91,0.3)", borderRadius: 999, padding: "3px 9px" }}>
                                  {m}
                                </span>
                              ))}
                            </span>
                          </>
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 12, color: "#4b5563", marginTop: 10 }}>
              Tocá un rubro para ver qué incluye. Podés ajustar los módulos después desde Configuración. Empezás con 15 días gratis.
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "#3a4322" : "linear-gradient(135deg, #4b5a2c, #6f7d49)",
              border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(80,96,55,0.4)"
            }}>
            {loading ? "Configurando..." : "Comenzar →"}
          </button>
        </form>
      </div>
    </div>
  )
}
