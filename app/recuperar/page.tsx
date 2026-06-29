"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Logo from "@/components/Logo"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")

  async function enviar() {
    setError("")
    if (!email.trim()) { setError("Ingresá tu email"); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/reset-password",
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setEnviado(true)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #14130d; }
        .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #14130d; font-family: 'DM Sans', Segoe UI, sans-serif; padding: 24px; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 44px 40px; width: 100%; max-width: 420px; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
        .field label { display: block; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
        .field input { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; color: white; font-size: 14px; font-family: inherit; outline: none; }
        .field input:focus { border-color: var(--accent-light); }
        .btn { width: 100%; padding: 13px; background: linear-gradient(135deg, var(--accent-dark), var(--accent)); border: none; border-radius: 10px; color: white; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 18px; box-shadow: 0 4px 16px rgba(80,96,55,0.4); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <div className="wrap">
        <div className="card">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, filter: "drop-shadow(0 6px 18px rgba(80,96,55,0.45))" }}><Logo size={52} /></div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "white", letterSpacing: 1 }}>Recuperar contraseña</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>
              Te enviamos un enlace a tu email para crear una nueva contraseña.
            </div>
          </div>

          {enviado ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📧</div>
              <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
                Si <b style={{ color: "white" }}>{email}</b> tiene una cuenta, le enviamos un enlace para restablecer la contraseña.
                Revisá tu bandeja (y el spam).
              </p>
              <Link href="/login" style={{ color: "#9aa86a", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>← Volver al login</Link>
            </div>
          ) : (
            <>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} placeholder="tu@email.com"
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && enviar()} autoFocus />
              </div>
              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginTop: 14, textAlign: "center" }}>{error}</div>
              )}
              <button className="btn" onClick={enviar} disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
              <div style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
                <Link href="/login" style={{ color: "#9aa86a", textDecoration: "none", fontWeight: 600 }}>← Volver al login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
