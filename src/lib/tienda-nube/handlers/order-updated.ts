import type { WebhookContext } from "./index"

export async function handleOrderUpdated(ctx: WebhookContext) {
  const { client, supabase, tienda, resourceId } = ctx

  const orderResult = await client.getOrder(resourceId)
  if (!orderResult.ok) {
    throw new Error(`Failed to fetch order ${resourceId}: ${orderResult.error}`)
  }
  const order = orderResult.data

  // Find existing pedido
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, estado_interno")
    .eq("tienda_nube_id", String(order.id))
    .eq("tienda_id", tienda.id)
    .single()

  if (!pedido) return // Order doesn't exist locally, ignore

  // Update amounts and payment info
  const montoTotal = parseFloat(order.total || "0")
  const updateData: Record<string, unknown> = {
    monto_total: montoTotal,
    observaciones: order.owner_note || undefined,
  }

  // Update datos_envio if available
  if (order.shipping_address) {
    updateData.datos_envio = order.shipping_address
  }

  await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", pedido.id)
}
