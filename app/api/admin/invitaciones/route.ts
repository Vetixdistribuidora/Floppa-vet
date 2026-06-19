import { createClient } from "@supabase/supabase-js"

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OWNER = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").toLowerCase()

async function esOwner(token: string) {
  const supa = createClient(SB_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await supa.auth.getUser()
  return !!(user?.email && OWNER && user.email.toLowerCase() === OWNER)
}

function nuevoCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sin O/0/I/1 para evitar confusiones
  let s = ""
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function GET(req: Request) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
  if (!(await esOwner(token))) return Response.json({ error: "No autorizado" }, { status: 403 })
  const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
  const { data } = await admin.from("invitaciones").select("*").order("created_at", { ascending: false })
  return Response.json(data || [])
}

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
  if (!(await esOwner(token))) return Response.json({ error: "No autorizado" }, { status: 403 })
  const { email, rubro, nota } = await req.json().catch(() => ({}))
  const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
  let codigo = nuevoCodigo()
  // Reintentar si choca con uno existente (muy improbable)
  for (let i = 0; i < 5; i++) {
    const { data: ex } = await admin.from("invitaciones").select("id").eq("codigo", codigo).maybeSingle()
    if (!ex) break
    codigo = nuevoCodigo()
  }
  const { data, error } = await admin.from("invitaciones").insert({
    codigo,
    email: email ? String(email).trim().toLowerCase() : null,
    rubro: rubro || null,
    nota: nota ? String(nota).trim() : null,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}

export async function DELETE(req: Request) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
  if (!(await esOwner(token))) return Response.json({ error: "No autorizado" }, { status: 403 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return Response.json({ error: "Falta id" }, { status: 400 })
  const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
  await admin.from("invitaciones").delete().eq("id", Number(id))
  return Response.json({ ok: true })
}
