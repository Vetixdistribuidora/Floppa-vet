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
