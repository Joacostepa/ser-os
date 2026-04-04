"use server"

import { createClient } from "@/lib/supabase/server"

interface SnapshotItem {
  descripcion: string
  cantidad: number
  precio_unitario: number
  producto_id?: string | null
  variante_id?: string | null
}

export async function guardarSnapshot(
  pedidoId: string,
  items: SnapshotItem[],
  montoTotal: number,
  montoNeto?: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("pedido_snapshot_tn")
    .insert({
      pedido_id: pedidoId,
      items: JSON.stringify(items),
      monto_total: montoTotal,
      monto_neto: montoNeto ?? null,
    })
    // ON CONFLICT DO NOTHING — if snapshot already exists, skip
    .select()

  // Ignore unique constraint errors (already exists)
  if (error && !error.message.includes("duplicate") && !error.code?.includes("23505")) {
    console.error("Error saving TN snapshot:", error.message)
  }
}

export async function getSnapshot(pedidoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pedido_snapshot_tn")
    .select("*")
    .eq("pedido_id", pedidoId)
    .single()

  if (error) return null
  return data as {
    id: string
    pedido_id: string
    items: string
    monto_total: number
    monto_neto: number | null
    created_at: string
  }
}
