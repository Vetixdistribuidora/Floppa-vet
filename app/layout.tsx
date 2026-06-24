import "./globals.css"
import Shell from "./Shell"

// Toda la app es client-side (SPA con datos de Supabase en el browser): no hay
// nada que prerenderizar. Como ESTE root layout es un Server Component, Next sí
// respeta el `force-dynamic` y saltea el prerender de build — que en Next 16 con
// esta app dispara un InvariantError (bug del prerender) y rompe `next build`.
// Toda la lógica de UI/cliente vive en <Shell> ("use client").
export const dynamic = "force-dynamic"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
