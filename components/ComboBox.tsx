"use client"

import { useState, useRef, useEffect } from "react"

export interface ComboOption {
  value: string
  label: string
  /** Segunda línea (gris) debajo del label. Ej: tutor, teléfono, especie. */
  sub?: string
  /** Texto extra por el que también se puede filtrar (no se muestra). Ej: nombre del tutor. */
  keywords?: string
}

// Select con búsqueda: muestra el seleccionado cuando está cerrado y permite
// escribir para filtrar cuando se enfoca. Útil con listas largas (ej. tutores).
export default function ComboBox({
  options, value, onChange,
  placeholder = "Buscar…", allowEmpty = true, emptyLabel = "— Sin asignar —",
}: {
  options: ComboOption[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const filtered = query.trim()
    ? options.filter(o => {
        const q = query.toLowerCase()
        return o.label.toLowerCase().includes(q)
          || (o.sub ?? "").toLowerCase().includes(q)
          || (o.keywords ?? "").toLowerCase().includes(q)
      })
    : options

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9,
    fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "white",
  }

  function pick(v: string) { onChange(v); setOpen(false); setQuery("") }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={open ? query : (selected?.label ?? "")}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); setQuery("") }}
        placeholder={selected ? selected.label : placeholder}
        style={inputStyle}
      />
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white",
          border: "1px solid #e2e8f0", borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          maxHeight: 220, overflowY: "auto", zIndex: 50,
        }}>
          {allowEmpty && (
            <div onMouseDown={() => pick("")} style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13.5, color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>
              {emptyLabel}
            </div>
          )}
          {filtered.length === 0 ? (
            <div style={{ padding: "9px 12px", fontSize: 13, color: "#94a3b8" }}>Sin resultados</div>
          ) : filtered.map(o => (
            <div
              key={o.value} onMouseDown={() => pick(o.value)}
              style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13.5, color: "#0f172a", background: o.value === value ? "#f4f2e6" : "white" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = o.value === value ? "#f4f2e6" : "white")}>
              <div style={{ fontWeight: o.sub ? 600 : 400 }}>{o.label}</div>
              {o.sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{o.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
