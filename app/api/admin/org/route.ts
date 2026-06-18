import { createClient } from "@supabase/supabase-js"

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OWNER = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").toLowerCase()

// Solo el dueño de la plataforma (Floppa) puede usar estas rutas.
async function esOwner(token: string) {
  const supa = createClient(SB_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await supa.auth.getUser()
  return !!(user?.email && OWNER && user.email.toLowerCase() === OWNER)
}

export async function GET(req: Request) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
  if (!(await esOwner(token))) return Response.json({ error: "No autorizado" }, { status: 403 })
  const id = new URL(req.url).searchParams.get("org")
  if (!id) return Response.json({ error: "Falta org" }, { status: 400 })
  const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
  const { data } = await admin.from("organizaciones").select("id, nombre, rubro, modulos").eq("id", id).maybeSingle()
  return Response.json(data || {})
}

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
  if (!(await esOwner(token))) return Response.json({ error: "No autorizado" }, { status: 403 })
  const { organizacion_id, rubro, modulos, precio_custom } = await req.json()
  if (!organizacion_id) return Response.json({ error: "Falta la organización" }, { status: 400 })
  const admin = createClient(SB_URL, SROLE, { auth: { persistSession: false } })
  await admin.from("organizaciones").update({ rubro, modulos }).eq("id", organizacion_id)
  // El plan sigue al rubro; precio_custom (si viene) pisa el precio del plan por cliente.
  const patch: any = {}
  if (rubro) {
    const { data: plan } = await admin.from("planes").select("id").eq("rubro", rubro).maybeSingle()
    if (plan) patch.plan_id = plan.id
  }
  if (precio_custom !== undefined) patch.precio_custom = (precio_custom === null || precio_custom === "") ? null : Number(precio_custom)
  if (Object.keys(patch).length) await admin.from("suscripciones").update(patch).eq("organizacion_id", organizacion_id)
  return Response.json({ ok: true })
}
