import Link from "next/link"

const ACTUALIZADO = "Junio 2026"

// NOTA: completá los datos entre corchetes con los de tu empresa antes de usarlo
// comercialmente, y revisalo con un asesor legal. Punto de partida, no asesoramiento.
const RAZON_SOCIAL = "Santiago Zabalegui"
const CUIT = "20-40668840-3"
const DOMICILIO = "General Manuel Dorrego 485, San Rafael, Mendoza"
const CONTACTO = "santiagozabalegui@gmail.com"

export default function PrivacidadPage() {
  return (
    <main style={wrap}>
      <article style={card}>
        <Link href="/login" style={back}>← Volver</Link>
        <h1 style={h1}>Política de Privacidad</h1>
        <p style={meta}>Última actualización: {ACTUALIZADO}</p>

        <p style={p}>
          Esta Política describe cómo <b>Flop</b> trata los datos personales, en cumplimiento de la
          Ley N.º 25.326 de Protección de los Datos Personales de la República Argentina y su
          normativa reglamentaria.
        </p>

        <h2 style={h2}>1. Responsable</h2>
        <p style={p}>
          Responsable del tratamiento: {RAZON_SOCIAL}, CUIT {CUIT}, domicilio en {DOMICILIO}.
          Contacto: {CONTACTO}.
        </p>

        <h2 style={h2}>2. Qué datos tratamos</h2>
        <p style={p}>
          <b>De la cuenta:</b> nombre del negocio, email y datos de acceso. <b>De facturación:</b> los
          necesarios para procesar el pago (gestionados por MercadoPago). <b>Datos que cargás como
          usuario:</b> información de tus clientes, pacientes, proveedores y operaciones. Respecto de
          estos últimos, vos sos el responsable y Flop actúa como encargado del tratamiento, usándolos
          solo para prestarte el Servicio.
        </p>

        <h2 style={h2}>3. Finalidad</h2>
        <p style={p}>
          Usamos los datos para crear y administrar tu cuenta, prestar el Servicio, procesar la
          suscripción, enviar comunicaciones operativas (por ejemplo recordatorios o avisos) y mejorar
          la plataforma.
        </p>

        <h2 style={h2}>4. Base / consentimiento</h2>
        <p style={p}>
          El tratamiento se basa en la ejecución del contrato de servicio y en tu consentimiento,
          otorgado al registrarte y aceptar estos términos.
        </p>

        <h2 style={h2}>5. Encargados y terceros</h2>
        <p style={p}>
          Para operar utilizamos proveedores que actúan como encargados: <b>Supabase</b> (base de datos
          y autenticación), <b>Vercel</b> (hosting), <b>MercadoPago</b> (pagos) y <b>Resend</b> (envío de
          emails). Algunos pueden alojar datos fuera de la Argentina; en esos casos se aplican
          resguardos para una protección adecuada. No vendemos tus datos.
        </p>

        <h2 style={h2}>6. Seguridad</h2>
        <p style={p}>
          Aplicamos medidas técnicas y organizativas razonables: aislamiento de datos por organización
          (Row Level Security), cifrado en tránsito y control de accesos por rol.
        </p>

        <h2 style={h2}>7. Conservación</h2>
        <p style={p}>
          Conservamos los datos mientras la cuenta esté activa y, luego de la baja, por los plazos
          legales aplicables, transcurridos los cuales se eliminan o anonimizan.
        </p>

        <h2 style={h2}>8. Tus derechos</h2>
        <p style={p}>
          Podés ejercer los derechos de acceso, rectificación, actualización y supresión de tus datos
          escribiendo a {CONTACTO}. El titular de los datos tiene derecho a acceder en forma gratuita a
          ellos a intervalos no inferiores a seis meses (Ley 25.326, art. 14). La <b>Agencia de Acceso a
          la Información Pública</b>, órgano de control de la Ley 25.326, atiende denuncias y reclamos.
        </p>

        <h2 style={h2}>9. Almacenamiento local</h2>
        <p style={p}>
          La app usa almacenamiento del navegador (localStorage) para mantener tu sesión y preferencias.
          No usamos cookies de seguimiento publicitario de terceros.
        </p>

        <h2 style={h2}>10. Cambios</h2>
        <p style={p}>
          Podemos actualizar esta Política; los cambios relevantes se comunicarán por la app o por email.
        </p>

        <p style={p}>
          Ver también nuestros <Link href="/terminos" style={a}>Términos y Condiciones</Link>.
        </p>

        <p style={metaFoot}>Flop · Política de Privacidad · {ACTUALIZADO}</p>
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
