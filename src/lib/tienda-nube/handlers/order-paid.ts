import type { WebhookContext } from "./index"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"

export async function handleOrderPaid(ctx: WebhookContext) {
  const { client, supabase, tienda, resourceId } = ctx

  const orderResult = await client.getOrder(resourceId)
  if (!orderResult.ok) {
    throw new Error(`Failed to fetch order ${resourceId}: ${orderResult.error}`)
  }
  const order = orderResult.data

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, tipo, monto_total, estado_interno")
    .eq("tienda_nube_id", String(order.id))
    .eq("tienda_id", tienda.id)
    .single()

  if (!pedido) return

  const montoTotal = parseFloat(order.total || "0")
  const nuevoEstado = "sena_recibida" as const

  await supabase
    .from("pedidos")
    .update({
      monto_total: montoTotal,
      monto_pagado: montoTotal,
      estado_interno: nuevoEstado,
      estado_publico: ESTADO_INTERNO_A_PUBLICO[nuevoEstado],
    })
    .eq("id", pedido.id)

  // Generate tasks if not already generated
  const { data: existingTareas } = await supabase
    .from("tareas")
    .select("id")
    .eq("pedido_id", pedido.id)
    .limit(1)

  if (!existingTareas || existingTareas.length === 0) {
    await supabase.rpc("generar_tareas_pedido", {
      p_pedido_id: pedido.id,
      p_tipo: pedido.tipo,
    })
  }

  await supabase.from("historial_pedido").insert({
    pedido_id: pedido.id,
    accion: `Pago confirmado desde Tienda Nube (${tienda.canal})`,
    estado_anterior: pedido.estado_interno,
    estado_nuevo: nuevoEstado,
  })
}
