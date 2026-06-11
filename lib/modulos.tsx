import React from "react"

// Registro central de módulos de la app. El sidebar y la configuración se
// construyen a partir de acá. Cada organización tiene su lista de módulos activos.

export interface Modulo {
  key: string
  label: string
  path: string
  color: string          // color del ícono
  core?: boolean         // siempre visible (no se puede desactivar)
  icon: React.ReactNode  // contenido interno del <svg viewBox="0 0 24 24">
}

export const MODULOS: Modulo[] = [
  { key: "inicio", label: "Inicio", path: "/", color: "#8a9a5b", core: true,
    icon: <><path d="M3 10l9-7 9 7" /><path d="M9 21V12h6v9" /></> },
  { key: "productos", label: "Productos", path: "/productos", color: "#34d399",
    icon: <><path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /></> },
  { key: "clientes", label: "Clientes", path: "/clientes", color: "#a78bfa",
    icon: <><circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></> },
  { key: "pacientes", label: "Pacientes", path: "/pacientes", color: "#5ec5c0",
    icon: <><circle cx="5.5" cy="12.5" r="1.7" /><circle cx="9.5" cy="8" r="1.7" /><circle cx="14.5" cy="8" r="1.7" /><circle cx="18.5" cy="12.5" r="1.7" /><path d="M12 14c-2.4 0-4.3 1.6-4.3 3.5 0 1.3 1 2.3 2.4 2.3 1 0 1.4-.4 1.9-.4s.9.4 1.9.4c1.4 0 2.4-1 2.4-2.3 0-1.9-1.9-3.5-4.3-3.5z" /></> },
  { key: "consultas", label: "Consultas", path: "/consultas", color: "#f9a8d4",
    icon: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /><path d="M12 10.5v5M9.5 13h5" /></> },
  { key: "recordatorios", label: "Recordatorios", path: "/recordatorios", color: "#f59e0b",
    icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></> },
  { key: "ventas", label: "Ventas", path: "/ventas", color: "#fbbf24",
    icon: <><path d="M3 3h2l.4 2M7 13h10l4-8H5.4" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></> },
  { key: "proveedores", label: "Proveedores", path: "/proveedores", color: "#f87171",
    icon: <><path d="M3 7h13v10H3z" /><path d="M16 10h4l1 2v5h-5z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></> },
  { key: "compras", label: "Compras", path: "/compras", color: "#fb923c",
    icon: <><path d="M6 6h15l-1.5 9h-13z" /><path d="M6 6L5 3H2" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></> },
  { key: "cuentas", label: "Cuenta Corriente", path: "/cuentas", color: "#22c55e",
    icon: <><path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M14 2v6h6" /></> },
  { key: "caja", label: "Caja", path: "/caja", color: "#10b981",
    icon: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4M18 10v4" /></> },
  { key: "reportes", label: "Reportes", path: "/reportes", color: "#a78bfa",
    icon: <><path d="M18 20V10M12 20V4M6 20v-6" /></> },
  { key: "deudores", label: "Deudores", path: "/deudores", color: "#f87171",
    icon: <><circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /><line x1="17" y1="3" x2="21" y2="7" /><line x1="21" y1="3" x2="17" y2="7" /></> },
  { key: "tienda-online", label: "Tienda Online", path: "/tienda-online", color: "#f472b6",
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></> },
  { key: "pedidos", label: "Pedidos", path: "/pedidos", color: "#8a9a5b",
    icon: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></> },
  { key: "cheques", label: "Cheques", path: "/cheques", color: "#34d399",
    icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /><path d="M6 15h4M14 15h2" /></> },
  { key: "mermas", label: "Mermas", path: "/mermas", color: "#f87171",
    icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></> },
]

// Módulos que se pueden activar/desactivar (excluye los core)
export const MODULOS_TOGGLEABLES = MODULOS.filter(m => !m.core)

// Presets por rubro: qué módulos vienen activos por defecto
export const PRESETS_RUBRO: Record<string, string[]> = {
  distribuidora: ["productos", "clientes", "ventas", "proveedores", "compras", "cuentas", "caja", "reportes", "deudores", "cheques", "mermas", "pedidos", "tienda-online"],
  general:       ["productos", "clientes", "ventas", "caja", "reportes", "cuentas", "deudores"],
  veterinaria:   ["productos", "clientes", "pacientes", "consultas", "recordatorios", "ventas", "caja", "reportes", "cuentas", "deudores"],
}

export const DEFAULT_MODULOS = PRESETS_RUBRO.distribuidora

export const RUBROS = [
  { key: "distribuidora", label: "Distribuidora / Mayorista" },
  { key: "general", label: "Comercio general" },
  { key: "veterinaria", label: "Veterinaria" },
]

/** Devuelve la lista de módulos activos de una org (con fallback al default). */
export function modulosActivos(modulos: string[] | null | undefined): string[] {
  return Array.isArray(modulos) ? modulos : DEFAULT_MODULOS
}
