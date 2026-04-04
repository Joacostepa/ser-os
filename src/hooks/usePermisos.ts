"use client"

import {
  puedeVerCostos,
  puedeVerFinanzas,
  puedeVerMontos,
  puedeEditarPedidos,
  puedeVerModulo,
} from "@/lib/auth/permisos"

export function usePermisos(userRol: string | undefined) {
  const rol = userRol || "lectura"
  return {
    rol,
    esAdmin: rol === "admin",
    verCostos: puedeVerCostos(rol),
    verFinanzas: puedeVerFinanzas(rol),
    verMontos: puedeVerMontos(rol),
    editarPedidos: puedeEditarPedidos(rol),
    puedeVerModulo: (modulo: string) => puedeVerModulo(rol, modulo),
  }
}
