import { createClient } from "@supabase/supabase-js"

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Devuelve { org, rol } del usuario que llama, o null si no es admin de una org.
async function adminQueLlama(token: string) {
  const supa = createClient(SB_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data } = await supa.from("org_usuarios").select("organizacion_id, rol, user_id").eq("rol", "admin").maybeSingle()
  return data?.rol === "admin" ? data : null
}

export async function POST(req: Request) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
    if (!token) return Response.json({ error: "No autenticado" }, { status: 401 })
    const me = await adminQueLlama(token)
    if (!me) return Response.json({ error: "Solo el dueño puede dar de alta usuarios" }, { status: 403 })

    const { email, password, rol } = await req.json()
    if (!email || !password || password.length < 6) return Response.json({ error: "Email y contraseña (mín. 6) requeridos" }, { status: 400 })
    if (!["veterinario", "recepcion", "admin"].includes(rol)) return Response.json({ error: "Rol inválido" }, { status: 400 })

    // Crear el usuario en Auth (confirmado)
    const cr = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: "POST", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password, email_confirm: true }),
    })
    const cj = await cr.json()
    if (!cr.ok) return Response.json({ error: cj.msg || cj.error_description || "No se pudo crear el usuario" }, { status: 400 })

    const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
    const { error } = await admin.from("org_usuarios").insert({ user_id: cj.id, organizacion_id: me.organizacion_id, rol, email: String(email).trim().toLowerCase() })
    if (error) {
      await fetch(`${SB_URL}/auth/v1/admin/users/${cj.id}`, { method: "DELETE", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}` } })
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
    if (!token) return Response.json({ error: "No autenticado" }, { status: 401 })
    const me = await adminQueLlama(token)
    if (!me) return Response.json({ error: "Solo el dueño puede quitar usuarios" }, { status: 403 })

    const { user_id } = await req.json()
    if (!user_id || user_id === me.user_id) return Response.json({ error: "No válido" }, { status: 400 })

    const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
    // Verificar que pertenece a la misma org
    const { data: target } = await admin.from("org_usuarios").select("user_id").eq("user_id", user_id).eq("organizacion_id", me.organizacion_id).maybeSingle()
    if (!target) return Response.json({ error: "Usuario no encontrado en tu organización" }, { status: 404 })

    await admin.from("org_usuarios").delete().eq("user_id", user_id).eq("organizacion_id", me.organizacion_id)
    await fetch(`${SB_URL}/auth/v1/admin/users/${user_id}`, { method: "DELETE", headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}` } })
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Error" }, { status: 500 })
  }
}
