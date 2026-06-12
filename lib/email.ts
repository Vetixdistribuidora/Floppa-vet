// lib/email.ts — envío de emails vía Resend (SOLO server-side: usa RESEND_API_KEY).
// No importar desde componentes "use client".

const RESEND_URL = "https://api.resend.com/emails"

export async function enviarEmail(opts: { to: string; subject: string; html: string; fromName?: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("Falta configurar RESEND_API_KEY")
  // RESEND_FROM puede ser "algo@dominio.com" o "Nombre <algo@dominio.com>"
  const fromBase = process.env.RESEND_FROM || "onboarding@resend.dev"
  const addr = fromBase.match(/<(.+)>/)?.[1] || fromBase
  const from = `${(opts.fromName || "Floppa").replace(/[<>]/g, "")} <${addr}>`

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  })
  if (!res.ok) throw new Error("Resend " + res.status + ": " + (await res.text()))
  return res.json()
}

// Arma y envía el email de un recordatorio a su tutor.
export async function enviarRecordatorio(r: any, tutor: any, orgNombre: string) {
  const fechaTxt = r.fecha
    ? new Date(r.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : ""
  const mascota = r.pacientes?.nombre ? ` de ${r.pacientes.nombre}` : ""
  const tutorNombre = `${tutor.nombre || ""} ${tutor.apellido || ""}`.trim()
  const subject = `Recordatorio: ${r.tipo || "Turno"}${mascota} — ${orgNombre}`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
      <div style="background:#6f7d49;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">⏰ Recordatorio${mascota}</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:22px;line-height:1.6">
        <p style="margin:0 0 10px">Hola ${tutorNombre || ""},</p>
        <p style="margin:0 0 12px">Te recordamos: <b>${r.tipo || "Turno"}</b>${r.descripcion ? ` — ${r.descripcion}` : ""}.</p>
        <p style="background:#f4f2e6;border:1px solid #e6e8cf;border-radius:8px;padding:10px 14px;margin:0">📅 <b style="text-transform:capitalize">${fechaTxt}</b></p>
        <p style="color:#64748b;font-size:13px;margin:18px 0 0">— ${orgNombre}</p>
      </div>
    </div>`
  return enviarEmail({ to: tutor.email, subject, html, fromName: orgNombre })
}
