import { createClient } from '@supabase/supabase-js'

/**
 * Fetch con timeout de 25 segundos y manejo de red offline.
 *
 * Sin esto, si hay un problema de red una request puede quedar colgada
 * indefinidamente, dejando los botones bloqueados (el finally nunca corre).
 *
 * Con esto:
 *  - Si no hay red: error inmediato
 *  - Si la request cuelga: se cancela a los 25s con mensaje claro
 *  - El AbortError genérico se convierte en mensaje entendible
 */
function fetchConTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Detección inmediata de red caída (sin esperar timeout)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return Promise.reject(new Error('Sin conexión a internet. Verificá tu red e intentá de nuevo.'))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)

  // Propagar señal existente del caller (si la hay) al nuestro
  const existingSignal = init?.signal
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort()
    } else {
      existingSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return fetch(input, { ...init, signal: controller.signal })
    .catch(err => {
      // Convertir el AbortError genérico en un mensaje entendible
      if (err?.name === 'AbortError') {
        throw new Error('La operación tardó demasiado. Verificá tu conexión e intentá de nuevo.')
      }
      throw err
    })
    .finally(() => clearTimeout(timer))
}

// Tolerar que NEXT_PUBLIC_SUPABASE_URL venga con /rest/v1 o barra final
// (error común al copiar la "API URL" del dashboard de Supabase).
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")

export const supabase = createClient(
  SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // No buscar sesión en la URL (no usamos OAuth con redirect): evita trabas al cargar.
      detectSessionInUrl: false,
      // Reemplazar el lock por defecto (Web Locks API). En PWA / standalone ese lock
      // a veces queda trabado y deja las consultas colgadas en "Cargando" hasta recargar.
      // Con este lock simple (sin Web Locks) el refresco de token nunca se traba.
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
    },
    global: { fetch: fetchConTimeout },
  }
)
