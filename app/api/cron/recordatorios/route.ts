import { createClient } from "@supabase/supabase-js"
import { enviarRecordatorio, enviarCumpleanos } from "@/lib/email"

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
      const { data: org } = await admin.from("organizaciones").select("nombre, email").eq("id", (r as any).organizacion_id).maybeSingle()
      await enviarRecordatorio(r, tutor, org || {})
      await admin.from("recordatorios").update({ email_enviado_at: new Date().toISOString() }).eq("id", (r as any).id)
      enviados++
    } catch (e) { console.error("cron recordatorio", (r as any).id, e) }
  }
  // ── Cumpleaños del día: avisar al tutor ──
  const ahora = new Date()
  const mmdd = `${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`
  const year = ahora.getFullYear()
  const { data: pacs } = await admin
    .from("pacientes")
    .select("id, nombre, fecha_nacimiento, cumple_email_year, organizacion_id, clientes(nombre, apellido, email)")
    .not("fecha_nacimiento", "is", null)
  let cumples = 0
  for (const p of pacs || []) {
    if (((p as any).fecha_nacimiento || "").slice(5) !== mmdd) continue
    if ((p as any).cumple_email_year === year) continue
    const tutor = (p as any).clientes
    if (!tutor?.email) continue
    try {
      const { data: org } = await admin.from("organizaciones").select("nombre, email").eq("id", (p as any).organizacion_id).maybeSingle()
      await enviarCumpleanos(p, tutor, org || {})
      await admin.from("pacientes").update({ cumple_email_year: year }).eq("id", (p as any).id)
      cumples++
    } catch (e) { console.error("cron cumple", (p as any).id, e) }
  }

  return Response.json({ ok: true, fecha: hoy, recordatorios: enviados, sinEmail, cumples })
}
