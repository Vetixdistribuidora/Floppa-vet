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

/** Encabezado para comprobantes: el logo del cliente si tiene, si no su nombre
 *  configurado como texto. Nunca usa un logo por defecto (evita marcas ajenas). */
export function empresaEncabezadoHTML(alturaPx = 110): string {
  const url = empresaLogoUrl()
  if (url) return `<img src="${url}" class="logo" style="height:${alturaPx}px;display:block;object-fit:contain" alt=""/>`
  const nombre = empresaNombre()
  return `<div style="font-size:26px;font-weight:800;color:#5b6b34;letter-spacing:.5px;line-height:1.1">${nombre || "Mi negocio"}</div>`
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
