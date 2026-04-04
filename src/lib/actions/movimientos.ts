"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { TipoMovimientoStock, ReferenciaMovimiento } from "@/types/database"

export async function registrarMovimiento(data: {
  insumo_id: string
  tipo: TipoMovimientoStock
  cantidad: number
  referencia_tipo?: ReferenciaMovimiento
  referencia_id?: string
  notas?: string
}) {
  const supabase = await createClient()

  const { data: movimiento, error } = await supabase.rpc("registrar_movimiento_stock", {
    p_insumo_id: data.insumo_id,
    p_tipo: data.tipo,
    p_cantidad: data.cantidad,
    p_referencia_tipo: data.referencia_tipo || null,
    p_referencia_id: data.referencia_id || null,
    p_notas: data.notas || null,
    p_usuario_id: null,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/insumos/${data.insumo_id}`)
  revalidatePath("/insumos")
  return movimiento
}

export async function ajustarStock(data: {
  insumo_id: string
  tipo: TipoMovimientoStock
  cantidad: number
  notas?: string
}) {
  return registrarMovimiento({
    insumo_id: data.insumo_id,
    tipo: data.tipo,
    cantidad: data.cantidad,
    referencia_tipo: "ajuste_manual",
    notas: data.notas,
  })
}

export async function getMovimientos(filtros?: {
  insumo_id?: string
  tipo?: TipoMovimientoStock
  limit?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from("movimientos_stock")
    .select(`
      *,
      insumo:insumos(id, nombre, unidad)
    `)
    .order("created_at", { ascending: false })
    .limit(filtros?.limit || 100)

  if (filtros?.insumo_id) {
    query = query.eq("insumo_id", filtros.insumo_id)
  }
  if (filtros?.tipo) {
    query = query.eq("tipo", filtros.tipo)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
