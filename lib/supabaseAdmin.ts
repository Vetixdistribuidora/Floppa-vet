import { createClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase con service_role — bypasea RLS.
 * SOLO usar en API routes (servidor). Nunca importar en "use client" components.
 */
// Misma normalización de URL que en lib/supabase.ts (tolera /rest/v1 o barra final)
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "")

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
