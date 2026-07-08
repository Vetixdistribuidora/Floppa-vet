"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// Rol del usuario logueado en su organización. Mientras carga asume "admin"
// (no oculta nada de más) — la protección real está en la RLS de la base,
// esto es solo para no mostrar botones de borrar que el servidor va a rechazar.
export function useRol() {
  const [rol, setRol] = useState<string>("admin")
  useEffect(() => {
    supabase.from("org_usuarios").select("rol").maybeSingle().then(({ data }) => {
      setRol(data?.rol || "admin")
    })
  }, [])
  return { rol, esAdmin: rol === "admin" }
}
