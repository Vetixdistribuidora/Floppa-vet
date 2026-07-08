"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// Rol del usuario logueado en su organización. Mientras carga asume "" (nada de
// admin) para no mostrar botones de borrar que el servidor va a rechazar.
// IMPORTANTE: se filtra por user_id porque la política org_usuarios_select deja
// ver a TODO el equipo — sin el filtro, un org con varios usuarios devolvería
// varias filas y maybeSingle() fallaría (cayendo por error a "admin").
export function useRol() {
  const [rol, setRol] = useState<string>("")
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("org_usuarios").select("rol").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => setRol(data?.rol || "admin"))
    })
  }, [])
  return { rol, esAdmin: rol === "admin" }
}
