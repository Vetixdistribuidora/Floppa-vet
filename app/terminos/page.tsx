import Link from "next/link"

const ACTUALIZADO = "Junio 2026"

// NOTA: completá los datos entre corchetes con los de tu empresa (razón social,
// CUIT, domicilio, email de contacto) antes de usarlo comercialmente, y revisalo
// con un asesor legal. Es un punto de partida, no asesoramiento jurídico.
const RAZON_SOCIAL = "Santiago Zabalegui"
const CUIT = "20-40668840-3"
const DOMICILIO = "General Manuel Dorrego 485, San Rafael, Mendoza"
const CONTACTO = "santiagozabalegui@gmail.com"

export default function TerminosPage() {
  return (
    <main style={wrap}>
      <article style={card}>
        <Link href="/login" style={back}>← Volver</Link>
        <h1 style={h1}>Términos y Condiciones de Uso</h1>
        <p style={meta}>Última actualización: {ACTUALIZADO}</p>

        <p style={p}>
          Estos Términos regulan el uso de <b>Flop</b> (el “Servicio”), una plataforma de
          gestión por suscripción operada por {RAZON_SOCIAL}, CUIT {CUIT}, con domicilio en {DOMICILIO}.
          Al crear una cuenta o utilizar el Servicio, aceptás estos Términos.
        </p>

        <h2 style={h2}>1. El Servicio</h2>
        <p style={p}>
          Flop es un software como servicio (SaaS) que permite administrar ventas, stock, compras,
          clientes y —según el rubro— módulos adicionales. El Servicio se brinda “tal cual” y puede
          evolucionar con nuevas funciones o ajustes.
        </p>

        <h2 style={h2}>2. Cuenta y acceso</h2>
        <p style={p}>
          El alta puede requerir un código de invitación. Sos responsable de la confidencialidad de
          tus credenciales y de toda actividad realizada bajo tu cuenta. El titular de la cuenta puede
          crear accesos para su equipo y es responsable del uso que estos hagan.
        </p>

        <h2 style={h2}>3. Suscripción, prueba y pagos</h2>
        <p style={p}>
          El Servicio incluye un período de prueba gratuito (15 días). Finalizado, se requiere una
          suscripción mensual cuyo precio depende del rubro/plan elegido. Los pagos se procesan a
          través de MercadoPago con renovación automática mensual. Podés cancelar cuando quieras; la
          cancelación detiene futuras renovaciones y el acceso continúa hasta el fin del período pago.
          La falta de pago habilita la suspensión del acceso hasta su regularización.
        </p>

        <h2 style={h2}>4. Tus datos</h2>
        <p style={p}>
          Los datos que cargás (productos, clientes, pacientes, ventas, etc.) son de tu propiedad. Vos
          sos responsable de su licitud y exactitud. Flop actúa como encargado del tratamiento y los
          utiliza únicamente para prestarte el Servicio. El tratamiento de datos personales se rige por
          nuestra <Link href="/privacidad" style={a}>Política de Privacidad</Link>.
        </p>

        <h2 style={h2}>5. Uso aceptable</h2>
        <p style={p}>
          No podés usar el Servicio para fines ilícitos, vulnerar la seguridad de la plataforma,
          intentar acceder a datos de otras organizaciones, ni revender el Servicio sin autorización.
        </p>

        <h2 style={h2}>6. Disponibilidad y responsabilidad</h2>
        <p style={p}>
          Procuramos la mayor disponibilidad posible, pero el Servicio puede tener interrupciones por
          mantenimiento o causas ajenas. En la máxima medida permitida por la ley, no respondemos por
          lucro cesante ni daños indirectos. Te recomendamos exportar/respaldar tu información
          periódicamente.
        </p>

        <h2 style={h2}>7. Baja y eliminación</h2>
        <p style={p}>
          Podés solicitar la baja de tu cuenta escribiendo a {CONTACTO}. Tras la baja, tus datos podrán
          conservarse por el plazo legal aplicable y luego eliminarse.
        </p>

        <h2 style={h2}>8. Modificaciones</h2>
        <p style={p}>
          Podemos actualizar estos Términos. Los cambios relevantes se comunicarán por la app o por
          email. El uso posterior implica su aceptación.
        </p>

        <h2 style={h2}>9. Ley aplicable</h2>
        <p style={p}>
          Estos Términos se rigen por las leyes de la República Argentina. Para cualquier controversia
          se aplicará la jurisdicción de los tribunales competentes del domicilio del titular del
          Servicio.
        </p>

        <h2 style={h2}>10. Contacto</h2>
        <p style={p}>Consultas: {CONTACTO}.</p>

        <p style={metaFoot}>
          Flop · Términos y Condiciones · {ACTUALIZADO}
        </p>
      </article>
    </main>
  )
}

const wrap: React.CSSProperties = { minHeight: "100vh", background: "#14130d", padding: "40px 20px", fontFamily: "DM Sans, Segoe UI, sans-serif" }
const card: React.CSSProperties = { maxWidth: 760, margin: "0 auto", background: "#fbfaf6", borderRadius: 16, padding: "44px 48px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }
const back: React.CSSProperties = { color: "#6f7d49", textDecoration: "none", fontSize: 13, fontWeight: 700 }
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 800, color: "#1d1b12", margin: "18px 0 6px" }
const h2: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "#1d1b12", margin: "26px 0 8px" }
const p: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.7, color: "#3f3b30", margin: "0 0 10px" }
const a: React.CSSProperties = { color: "#6f7d49", fontWeight: 700 }
const meta: React.CSSProperties = { fontSize: 12.5, color: "#8a8675", margin: "0 0 18px" }
const metaFoot: React.CSSProperties = { fontSize: 12, color: "#a8a48f", marginTop: 30, textAlign: "center" }
