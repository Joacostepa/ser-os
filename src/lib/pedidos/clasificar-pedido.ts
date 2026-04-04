"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function clasificarPedido(
  pedidoId: string,
  tipo: string,
): Promise<{ autoHabilitado: boolean }> {
  const supabase = await createClient()

  // 1. Update tipo
  const { error: updateError } = await supabase
    .from("pedidos")
    .update({ tipo })
    .eq("id", pedidoId)

  if (updateError) {
    throw new Error(`Error al actualizar tipo: ${updateError.message}`)
  }

  // 2. Check current state and payment info
  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("estado_interno, monto_pagado, monto_total")
    .eq("id", pedidoId)
    .single()

  if (fetchError || !pedido) {
    throw new Error("Pedido no encontrado")
  }

  let autoHabilitado = false
  const montoPagado = Number(pedido.monto_pagado || 0)
  const montoTotal = Number(pedido.monto_total || 0)

  // 3. Auto-habilitar if conditions met
  if (pedido.estado_interno === "nuevo" && montoPagado >= montoTotal && montoTotal > 0) {
    // Fully paid + classified → habilitar
    const { ejecutarTransicion } = await import("@/lib/maquina-estados")
    await ejecutarTransicion(pedidoId, "habilitado")
    autoHabilitado = true
  } else if (
    (pedido.estado_interno === "pendiente_de_sena" || pedido.estado_interno === "pendiente_sena") &&
    montoPagado > 0
  ) {
    // Has partial/full payment + classified → habilitar
    const { ejecutarTransicion } = await import("@/lib/maquina-estados")
    await ejecutarTransicion(pedidoId, "habilitado")
    autoHabilitado = true
  }

  // 4. Generate tasks for the classified type
  if (autoHabilitado) {
    await supabase.rpc("generar_tareas_pedido", {
      p_pedido_id: pedidoId,
      p_tipo: tipo,
    })
  }

  // 5. Log in history
  await supabase.from("historial_pedido").insert({
    pedido_id: pedidoId,
    accion: `Clasificado como ${tipo}`,
    estado_nuevo: pedido.estado_interno,
  })

  // 6. Revalidate paths
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${pedidoId}`)
  revalidatePath("/operaciones")

  return { autoHabilitado }
}
