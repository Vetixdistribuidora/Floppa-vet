"use client"

// Página de error global (reemplaza al root layout cuando algo falla muy arriba).
// Next la prerenderiza en build; mantenerla mínima y autocontenida (sin imports de
// la app ni CSS global) evita el InvariantError del prerender de Next 16.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#14130d", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", color: "white", padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Algo salió mal</h2>
          <p style={{ margin: "0 0 20px", color: "#9ca3af", fontSize: 14 }}>Recargá la página para volver a intentar.</p>
          <button
            onClick={() => reset()}
            style={{ background: "linear-gradient(135deg,#4b5a2c,#6f7d49)", color: "white", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
