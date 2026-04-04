"use server"

import { createClient } from "@/lib/supabase/server"
import type { TipoAsiento } from "@/types/database"

interface LineaAsiento {
  cuenta_codigo: string
  debe: number
  haber: number
  descripcion?: string
}

export async function crearAsiento(params: {
  fecha: Date | string
  descripcion: string
  tipo: TipoAsiento
  referencia_tipo?: string
  referencia_id?: string
  lineas: LineaAsiento[]
}): Promise<number> {
  const supabase = await createClient()

  // Validate balance in JS first
  const totalDebe = params.lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = params.lineas.reduce((s, l) => s + l.haber, 0)

  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    throw new Error(`Asiento descuadrado: debe=${totalDebe}, haber=${totalHaber}`)
  }

  // Build JSONB lines
  const lineasJson = params.lineas.map((l) => ({
    cuenta_codigo: l.cuenta_codigo,
    debe: l.debe,
    haber: l.haber,
    descripcion: l.descripcion || null,
  }))

  const fecha = typeof params.fecha === "string" ? params.fecha : params.fecha.toISOString().split("T")[0]

  const { data, error } = await supabase.rpc("crear_asiento_contable", {
    p_fecha: fecha,
    p_descripcion: params.descripcion,
    p_tipo: params.tipo,
    p_referencia_tipo: params.referencia_tipo || null,
    p_referencia_id: params.referencia_id || null,
    p_usuario_id: null,
    p_lineas: JSON.stringify(lineasJson),
  })

  if (error) throw new Error(`Error al crear asiento: ${error.message}`)
  return data as number
}

export async function anularAsiento(asientoId: number): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("anular_asiento", {
    p_asiento_id: asientoId,
  })

  if (error) throw new Error(`Error al anular asiento: ${error.message}`)
  return data as number
}
