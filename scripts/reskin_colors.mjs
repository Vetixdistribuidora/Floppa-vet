// reskin_colors.mjs — Reemplaza la paleta azul por la paleta oliva/arena de Floppa
// en todos los archivos .tsx/.ts de app/ y lib/. Solo cambia colores (hex/rgba).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, extname } from "node:path"

const MAP = {
  // rgba (reemplaza solo la parte rgb, conserva el alpha)
  "rgba(59,130,246": "rgba(111,125,73",   // blue-500  -> oliva
  "rgba(37,99,235":  "rgba(91,107,52",    // blue-600
  "rgba(99,102,241": "rgba(100,122,62",   // indigo
  // hex
  "#1e3a8a": "#3a4322",
  "#1e40af": "#4b5a2c",
  "#1d4ed8": "#55692f",
  "#2563eb": "#5b6b34",
  "#1971c2": "#5b6b34",  // azul de comprobantes
  "#3b82f6": "#6f7d49",
  "#60a5fa": "#8a9a5b",
  "#93c5fd": "#a8b67d",
  "#bfdbfe": "#cdd6a8",
  "#dbeafe": "#e6e8cf",
  "#e0f2fe": "#e9ecd6",
  "#e7f5ff": "#eef0e0",
  "#eff6ff": "#f4f2e6",
  "#6366f1": "#647a3e",
}

const files = []
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) {
      if (![".next", "node_modules", ".git", ".claude"].includes(f)) walk(p)
    } else if ([".tsx", ".ts"].includes(extname(f))) files.push(p)
  }
}
walk("app"); walk("lib")

let totalFiles = 0, totalRepl = 0
for (const f of files) {
  let t = readFileSync(f, "utf8")
  let n = 0
  for (const [from, to] of Object.entries(MAP)) {
    const parts = t.split(from)
    if (parts.length > 1) { n += parts.length - 1; t = parts.join(to) }
  }
  if (n) { writeFileSync(f, t); totalFiles++; totalRepl += n; console.log("  " + f.padEnd(38) + n) }
}
console.log(`\n✅ ${totalRepl} reemplazos en ${totalFiles} archivos.`)
