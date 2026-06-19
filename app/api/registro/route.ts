import { createClient } from "@supabase/supabase-js"

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")
const SROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Alta de cuenta SOLO con un código de invitación válido (de un solo uso).
// Esto reemplaza el signup público: el front llama acá y nosotros creamos el
// usuario con el service role tras validar el código.
export async function POST(req: Request) {
  try {
    const { nombre_negocio, email, password, codigo } = await req.json()
    const mail = String(email || "").trim().toLowerCase()
    const cod = String(codigo || "").trim()
    if (!mail || !password || password.length < 6) return Response.json({ error: "Email y contraseña (mín. 6) requeridos" }, { status: 400 })
    if (!cod) return Response.json({ error: "Falta el código de invitación" }, { status: 400 })

    const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })

    // Validar el código
    const { data: inv } = await admin.from("invitaciones").select("*").eq("codigo", cod).maybeSingle()
    if (!inv) return Response.json({ error: "Código de invitación inválido" }, { status: 403 })
    if (inv.usada) return Response.json({ error: "Ese código ya fue usado" }, { status: 403 })
    if (inv.email && inv.email.trim().toLowerCase() !== mail) return Response.json({ error: "El código no corresponde a ese email" }, { status: 403 })

    // Crear el usuario (confirmado, para que pueda entrar directo)
    const cr = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: "POST", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: mail, password, email_confirm: true, user_metadata: { nombre_negocio: String(nombre_negocio || "").trim() } }),
    })
    const cj = await cr.json()
    if (!cr.ok) {
      const msg = (cj.msg || cj.error_description || "").toLowerCase()
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists"))
        return Response.json({ error: "Ese email ya está registrado. Iniciá sesión." }, { status: 409 })
      return Response.json({ error: cj.msg || cj.error_description || "No se pudo crear la cuenta" }, { status: 400 })
    }

    // Consumir el código
    await admin.from("invitaciones").update({ usada: true, usada_por: mail, usada_at: new Date().toISOString() }).eq("id", inv.id)

    return Response.json({ ok: true, rubro: inv.rubro || null })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Error" }, { status: 500 })
  }
}
