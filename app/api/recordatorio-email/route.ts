import { createClient } from "@supabase/supabase-js"
import { enviarRecordatorio } from "@/lib/email"

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")

// Envío manual: el usuario toca "Enviar" en un recordatorio.
// Usa el JWT del usuario → la RLS garantiza que solo accede a su organización.
export async function POST(req: Request) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "")
    if (!token) return Response.json({ error: "No autenticado" }, { status: 401 })

    const supa = createClient(SB_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })

    const { id } = await req.json()
    const { data: r } = await supa
      .from("recordatorios")
      .select("*, pacientes(nombre, clientes(nombre, apellido, email))")
      .eq("id", id).maybeSingle()
    if (!r) return Response.json({ error: "Recordatorio no encontrado" }, { status: 404 })

    const tutor = r.pacientes?.clientes
    if (!tutor?.email) return Response.json({ error: "El tutor no tiene email cargado" }, { status: 400 })

    const { data: org } = await supa.from("organizaciones").select("nombre").maybeSingle()
    await enviarRecordatorio(r, tutor, org?.nombre || "Veterinaria")
    await supa.from("recordatorios").update({ email_enviado_at: new Date().toISOString() }).eq("id", id)

    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Error al enviar" }, { status: 500 })
  }
}
