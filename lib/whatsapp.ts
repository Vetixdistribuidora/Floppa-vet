// lib/whatsapp.ts
// Abre WhatsApp con un mensaje pre-armado (wa.me). Sin costo ni API: usa el
// WhatsApp del usuario. Normaliza teléfonos argentinos a formato internacional.

/** Convierte un teléfono argentino a dígitos formato wa.me (54 9 + área + número). */
export function normalizarTelAR(tel?: string | null): string {
  if (!tel) return ""
  let d = String(tel).replace(/\D/g, "")
  if (!d) return ""
  // Ya viene con prefijo internacional
  if (d.startsWith("54")) {
    // Asegurar el 9 de celular tras el 54
    if (!d.startsWith("549")) d = "549" + d.slice(2)
    return d
  }
  d = d.replace(/^0/, "")        // sacar 0 de larga distancia
  d = d.replace(/^(\d{2,4})15/, "$1") // sacar el 15 de celular si quedó pegado al área
  return "549" + d
}

/** URL de wa.me con texto, o null si el teléfono no sirve. */
export function whatsappUrl(tel: string | null | undefined, texto: string): string | null {
  const n = normalizarTelAR(tel)
  if (n.length < 8) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

/** Abre WhatsApp en otra pestaña. Devuelve false si no hay teléfono válido. */
export function abrirWhatsApp(tel: string | null | undefined, texto: string): boolean {
  const u = whatsappUrl(tel, texto)
  if (!u) return false
  window.open(u, "_blank")
  return true
}
