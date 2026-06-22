// lib/fecha.ts — Manejo de fechas/horas SIEMPRE en hora de Argentina (UTC-3 fijo,
// sin horario de verano), independientemente de la zona del dispositivo.

export const TZ_AR = "America/Argentina/Buenos_Aires"

/** Ahora, en formato para <input type="datetime-local"> (YYYY-MM-DDTHH:mm), hora AR. */
export function nowARInput(): string {
  const s = new Date().toLocaleString("sv-SE", { timeZone: TZ_AR }) // "2026-06-18 14:30:00"
  return s.slice(0, 16).replace(" ", "T")
}

/** Un timestamp ISO → valor para <input type="datetime-local"> en hora AR. */
export function isoToARInput(iso: string): string {
  const s = new Date(iso).toLocaleString("sv-SE", { timeZone: TZ_AR })
  return s.slice(0, 16).replace(" ", "T")
}

/** Wall-clock de AR ("YYYY-MM-DDTHH:mm") → ISO UTC correcto (AR = -03:00 fijo). */
export function arInputToISO(local: string): string {
  if (!local) return new Date().toISOString()
  return new Date(local.length === 16 ? local + ":00-03:00" : local).toISOString()
}

/** Fecha + hora en hora AR: "18/06 14:30". */
export function fmtFechaHoraAR(s: string): string {
  return new Date(s).toLocaleString("es-AR", { timeZone: TZ_AR, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

/** Solo fecha en hora AR: "18/06/2026". */
export function fmtFechaAR(s: string): string {
  return new Date(s).toLocaleDateString("es-AR", { timeZone: TZ_AR, day: "2-digit", month: "2-digit", year: "numeric" })
}
