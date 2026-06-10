"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Logo from "@/components/Logo"

export default function OnboardingPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Precargar el nombre del negocio que se ingresó en el registro
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.nombre_negocio
      if (n) setNombre(n)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError("Ingresá el nombre de tu negocio."); return }

    setLoading(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc("crear_organizacion", {
      p_nombre: nombre.trim()
    })

    if (rpcError) {
      setError("Error al crear la organización: " + rpcError.message)
      setLoading(false)
      return
    }

    // Crear la suscripción trial (15 días) — ya autenticado, la RLS lo permite
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const venc = new Date(); venc.setDate(venc.getDate() + 15)
      await supabase.from("suscripciones").upsert({
        email: user.email,
        nombre_negocio: nombre.trim(),
        estado: "trial",
        plan_id: 1,
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
        width: "100%", maxWidth: 460,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "44px 40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, filter: "drop-shadow(0 6px 18px rgba(80,96,55,0.45))" }}>
            <Logo size={56} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "white", letterSpacing: 2 }}>¡Bienvenido!</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>
            Configurá el nombre de tu negocio<br />para comenzar a usar Floppa
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700,
              color: "#9ca3af", letterSpacing: 0.5, marginBottom: 8,
              textTransform: "uppercase"
            }}>
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white", fontSize: 15, outline: "none",
                boxSizing: "border-box", fontFamily: "inherit"
              }}
            />
            <div style={{ fontSize: 12, color: "#4b5563", marginTop: 8 }}>
              Podés cambiarlo después desde Configuración.
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 20,
              color: "#f87171", fontSize: 13
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "#3a4322" : "linear-gradient(135deg, #4b5a2c, #6f7d49)",
              border: "none", borderRadius: 12, color: "white",
              fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(80,96,55,0.4)"
            }}
          >
            {loading ? "Configurando..." : "Comenzar →"}
          </button>
        </form>
      </div>
    </div>
  )
}
