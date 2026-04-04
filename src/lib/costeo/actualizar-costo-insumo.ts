"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function actualizarCostoInsumo(
  insumoId: string,
  costoNuevo: number,
  motivo?: string,
): Promise<void> {
  const supabase = await createClient()

  // 1. Get current costo_unitario
  const { data: insumo, error: insumoError } = await supabase
    .from("insumos")
    .select("costo_unitario")
    .eq("id", insumoId)
    .single()

  if (insumoError || !insumo) {
    throw new Error("Insumo no encontrado")
  }

  const costoAnterior = Number(insumo.costo_unitario)

  // 2. Insert into historial_costos_insumo
  const { error: historialError } = await supabase
    .from("historial_costos_insumo")
    .insert({
      insumo_id: insumoId,
      costo_anterior: costoAnterior,
      costo_nuevo: costoNuevo,
      motivo: motivo || null,
    })

  if (historialError) {
    throw new Error("Error al registrar historial de costo: " + historialError.message)
  }

  // 3. Update insumos.costo_unitario
  const { error: updateError } = await supabase
    .from("insumos")
    .update({ costo_unitario: costoNuevo })
    .eq("id", insumoId)

  if (updateError) {
    throw new Error("Error al actualizar costo: " + updateError.message)
  }

  // 4. Revalidate paths
  revalidatePath("/insumos")
  revalidatePath(`/insumos/${insumoId}`)
}
