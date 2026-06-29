// Paletas de color que el cliente puede elegir (Configuración).
// Recolorean lo más visible: sidebar, ítem activo, degradados y resplandor del logo.
export interface Tema {
  label: string
  sidebarBg: string   // fondo del menú lateral
  activeBg: string    // fondo del ítem activo
  accent: string      // color de acento del sidebar (borde activo, detalles — tono claro)
  grad: string        // degradado (caja de ícono del header, avatar)
  glow: string        // resplandor del logo
  // Tonos del CONTENIDO (botones, resaltados sobre fondo claro) → variables CSS
  page: string        // --accent (medio)
  pageDark: string    // --accent-dark (oscuro)
  pageLight: string   // --accent-light (claro)
}

export const TEMAS: Record<string, Tema> = {
  olivo:    { label: "Olivo",    sidebarBg: "#14130d", activeBg: "#2a2718", accent: "#8a9a5b", grad: "linear-gradient(135deg,#4b5a2c,#6f7d49)", glow: "rgba(80,96,55,0.4)",   page: "#6f7d49", pageDark: "#4b5a2c", pageLight: "#8a9a5b" },
  azul:     { label: "Azul",     sidebarBg: "#0d1424", activeBg: "#1b2740", accent: "#6f9adb", grad: "linear-gradient(135deg,#2c4b7a,#3f6fb0)", glow: "rgba(55,80,140,0.4)",  page: "#3f6fb0", pageDark: "#2c4b7a", pageLight: "#6f9adb" },
  bordo:    { label: "Bordó",    sidebarBg: "#1c0f12", activeBg: "#34181f", accent: "#cf8593", grad: "linear-gradient(135deg,#7a2c3a,#a83f53)", glow: "rgba(140,55,70,0.4)",  page: "#a83f53", pageDark: "#7a2c3a", pageLight: "#cf8593" },
  grafito:  { label: "Grafito",  sidebarBg: "#121316", activeBg: "#262a2f", accent: "#9aa3ad", grad: "linear-gradient(135deg,#3a414b,#5b6470)", glow: "rgba(80,90,100,0.4)",  page: "#5b6470", pageDark: "#3a414b", pageLight: "#9aa3ad" },
  turquesa: { label: "Turquesa", sidebarBg: "#0c1a1a", activeBg: "#163030", accent: "#5ec5c0", grad: "linear-gradient(135deg,#1f6b66,#2f9e96)", glow: "rgba(45,140,130,0.4)", page: "#2f9e96", pageDark: "#1f6b66", pageLight: "#5ec5c0" },
  violeta:  { label: "Violeta",  sidebarBg: "#16101f", activeBg: "#281d38", accent: "#a98bd6", grad: "linear-gradient(135deg,#4b2c7a,#6f49b0)", glow: "rgba(90,55,140,0.4)",  page: "#6f49b0", pageDark: "#4b2c7a", pageLight: "#a98bd6" },
}

export const TEMA_DEFAULT = "olivo"
export function getTema(key?: string | null): Tema {
  return TEMAS[key || ""] || TEMAS[TEMA_DEFAULT]
}
