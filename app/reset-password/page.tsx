"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Logo from "@/components/Logo"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [listo, setListo] = useState(false)   // sesión de recuperación establecida
  const [cargando, setCargando] = useState(true)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // El enlace de recuperación trae el token en el hash (#access_token=...&type=recovery).
    // Como el cliente tiene detectSessionInUrl:false, lo procesamos manualmente.
    const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(raw)
    const at = params.get("access_token")
    const rt = params.get("refresh_token")
    const errDesc = params.get("error_description")

    if (errDesc) {
      setError("El enlace expiró o ya se usó. Pedí uno nuevo desde «Olvidé mi contraseña».")
      setCargando(false)
      return
    }
    if (at && rt) {
      supabase.auth.setSession({ access_token: at, refresh_token: rt }).then(({ error }) => {
        if (error) setError("El enlace no es válido o expiró. Pedí uno nuevo.")
        else setListo(true)
        history.replaceState(null, "", window.location.pathname) // limpiar el token de la URL
        setCargando(false)
      })
    } else {
      // Tal vez ya hay sesión activa de recuperación
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setListo(true)
        else setError("Abrí esta página desde el enlace que te llegó por email.")
        setCargando(false)
      })
    }
  }, [])

  async function guardar() {
    setError("")
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return }
    if (password !== password2) { setError("Las contraseñas no coinciden"); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setOk(true)
    await supabase.auth.signOut()
    setTimeout(() => router.replace("/login"), 1600)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #14130d; }
        .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #14130d; font-family: 'DM Sans', Segoe UI, sans-serif; padding: 24px; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 44px 40px; width: 100%; max-width: 420px; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
        .field input { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; color: white; font-size: 14px; font-family: inherit; outline: none; }
        .field input:focus { border-color: var(--accent-light); }
        .btn { width: 100%; padding: 13px; background: linear-gradient(135deg, var(--accent-dark), var(--accent)); border: none; border-radius: 10px; color: white; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 6px; box-shadow: 0 4px 16px rgba(80,96,55,0.4); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <div className="wrap">
        <div className="card">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, filter: "drop-shadow(0 6px 18px rgba(80,96,55,0.45))" }}><Logo size={52} /></div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "white", letterSpacing: 1 }}>Nueva contraseña</div>
          </div>

          {cargando ? (
            <p style={{ color: "#9ca3af", textAlign: "center", fontSize: 14 }}>Verificando el enlace…</p>
          ) : ok ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6 }}>Contraseña actualizada. Te llevamos al login…</p>
            </div>
          ) : listo ? (
            <>
              <div className="field">
                <label>Nueva contraseña</label>
                <input type="password" value={password} placeholder="Mínimo 6 caracteres" onChange={e => setPassword(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>Repetir contraseña</label>
                <input type="password" value={password2} placeholder="••••••••" onChange={e => setPassword2(e.target.value)} onKeyDown={e => e.key === "Enter" && guardar()} />
              </div>
              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14, textAlign: "center" }}>{error}</div>
              )}
              <button className="btn" onClick={guardar} disabled={loading}>{loading ? "Guardando..." : "Guardar contraseña"}</button>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>{error}</p>
              <Link href="/recuperar" style={{ color: "#9aa86a", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Pedir un enlace nuevo</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
