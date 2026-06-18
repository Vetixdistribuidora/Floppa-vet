// lib/empresa.ts
// Datos de la empresa (organización) para encabezados y pies de comprobantes.
// Se cargan una vez al iniciar la app (layout) y se cachean en localStorage,
// así las ventanas de impresión (mismo origen) los tienen disponibles sin
// volver a consultar la base.

export interface Empresa {
  nombre: string
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  logo_url?: string | null
}

const KEY = "floppa_empresa"
let cache: Empresa | null = null

export function setEmpresa(e: Empresa) {
  cache = e
  try { localStorage.setItem(KEY, JSON.stringify(e)) } catch { /* ignore */ }
}

export function getEmpresa(): Empresa {
  if (cache) return cache
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null
    if (s) return (cache = JSON.parse(s))
  } catch { /* ignore */ }
  return { nombre: "" }
}

/** Logo: el de la organización si está configurado, si no /logo.png */
export function empresaLogo(): string {
  const e = getEmpresa()
  if (e.logo_url) return e.logo_url
  return (typeof window !== "undefined" ? window.location.origin : "") + "/logo.png"
}

/** URL del logo SOLO si el cliente subió uno propio; si no, null. */
export function empresaLogoUrl(): string | null {
  const e = getEmpresa()
  return e.logo_url || null
}

/** Logo de Floppa como SVG inline (mismo que se ve en la app), para impresión. */
export function logoFloppaSVG(px = 64): string {
  return `<svg width="${px}" height="${px}" viewBox="0 0 64 64" fill="none" style="display:block">`
    + `<rect x="3" y="3" width="58" height="58" rx="17" fill="#ddcca8"/>`
    + `<path d="M32 14 47 22 32 30 17 22Z" fill="#9aa86a"/>`
    + `<path d="M17 22 32 30 32 48 17 40Z" fill="#6f7d49"/>`
    + `<path d="M47 22 32 30 32 48 47 40Z" fill="#506037"/>`
    + `<g stroke="#fff" stroke-width="1.8" stroke-linejoin="round" fill="none" opacity="0.9">`
    + `<path d="M32 14 47 22 47 40 32 48 17 40 17 22Z"/><path d="M17 22 32 30 47 22"/><path d="M32 30V48"/></g></svg>`
}

/** Encabezado para comprobantes: el logo propio del cliente si tiene; si no, el
 *  logo de Floppa (el de la app) junto al nombre configurado por el cliente.
 *  Nunca usa marcas de terceros. */
export function empresaEncabezadoHTML(alturaPx = 110): string {
  const url = empresaLogoUrl()
  if (url) return `<img src="${url}" class="logo" style="height:${alturaPx}px;display:block;object-fit:contain" alt=""/>`
  const nombre = empresaNombre() || "Mi negocio"
  const px = Math.round(alturaPx * 0.8)
  return `<div style="display:flex;align-items:center;gap:12px">${logoFloppaSVG(px)}`
    + `<div style="font-size:24px;font-weight:800;color:#5b6b34;letter-spacing:.5px;line-height:1.1">${nombre}</div></div>`
}

/** Bloque bajo el logo: dirección / teléfono / email (omite los vacíos) */
export function empresaInfoHTML(): string {
  const e = getEmpresa()
  return [
    e.direccion || "",
    e.telefono ? "Tel: " + e.telefono : "",
    e.email ? "Email: " + e.email : "",
  ].filter(Boolean).join("<br/>")
}

/** Nombre para la línea de firma/sello */
export function empresaNombre(): string {
  return getEmpresa().nombre || ""
}

/** Pie de página: nombre — dirección — tel — email (omite los vacíos) */
export function empresaFooterHTML(): string {
  const e = getEmpresa()
  return [
    e.nombre || "",
    e.direccion || "",
    e.telefono ? "Tel: " + e.telefono : "",
    e.email || "",
  ].filter(Boolean).join(" — ")
}
