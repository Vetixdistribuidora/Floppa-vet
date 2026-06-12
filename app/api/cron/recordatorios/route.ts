import { createClient } from "@supabase/supabase-js"
import { enviarRecordatorio } from "@/lib/email"

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")

// Envío automático diario (Vercel Cron). Manda los recordatorios cuya fecha es
// HOY, que estén pendientes, no enviados aún y cuyo tutor tenga email.
// Multi-tenant: usa service role (bypass RLS) para recorrer todas las organizaciones.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const hoy = new Date().toISOString().split("T")[0]

  const { data: recs, error } = await admin
    .from("recordatorios")
    .select("*, organizacion_id, pacientes(nombre, clientes(nombre, apellido, email))")
    .eq("fecha", hoy).eq("estado", "pendiente").is("email_enviado_at", null)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let enviados = 0, sinEmail = 0
  for (const r of recs || []) {
    const tutor = (r as any).pacientes?.clientes
    if (!tutor?.email) { sinEmail++; continue }
    try {
      const { data: org } = await admin.from("organizaciones").select("nombre").eq("id", (r as any).organizacion_id).maybeSingle()
      await enviarRecordatorio(r, tutor, org?.nombre || "Veterinaria")
      await admin.from("recordatorios").update({ email_enviado_at: new Date().toISOString() }).eq("id", (r as any).id)
      enviados++
    } catch (e) { console.error("cron recordatorio", (r as any).id, e) }
  }
  return Response.json({ ok: true, fecha: hoy, total: recs?.length || 0, enviados, sinEmail })
}
