// Reemplaza los colores del tema viejo (azul marino / azul) por la paleta Floppa (oliva).
// Recorre app/ y lib/ (.tsx/.ts). No toca grises ni negros de texto.
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs"
import { join, extname } from "path"

const MAP = {
  "#0f172a": "#1d1b12", // navy panel/btn/heading -> dark olive
  "#1e293b": "#2a2718", // navy input/select bg -> dark olive 2
  "#1d293d": "#2a2718",
  "#0b1220": "#14130d",
  "#2563eb": "#6f7d49", // blue accents -> olive
  "#3b82f6": "#8a9a5b",
  "#1d4ed8": "#5b6b34",
  "#1e40af": "#4b5a2c",
  "#1e3a8a": "#3a4322",
  "#60a5fa": "#a8b67d",
  "#93c5fd": "#c9d3a3",
}

const dirs = ["app", "lib"]
let totalFiles = 0, totalReps = 0
const touched = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { walk(p); continue }
    const ext = extname(p)
    if (ext !== ".tsx" && ext !== ".ts") continue
    let src = readFileSync(p, "utf8")
    let reps = 0
    for (const [from, to] of Object.entries(MAP)) {
      const re = new RegExp(from.replace("#", "#"), "gi")
      src = src.replace(re, (m) => { reps++; return to })
    }
    if (reps > 0) { writeFileSync(p, src); touched.push(`${p} (${reps})`); totalFiles++; totalReps += reps }
  }
}

dirs.forEach(walk)
console.log(`Archivos: ${totalFiles} · Reemplazos: ${totalReps}`)
touched.forEach(t => console.log("  " + t))
