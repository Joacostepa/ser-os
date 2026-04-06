import type { WebhookContext } from "./index"

export async function handleOrderCancelled(ctx: WebhookContext) {
  const { supabase, tienda, resourceId } = ctx

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, estado_interno")
    .eq("tienda_nube_id", String(resourceId))
    .eq("tienda_id", tienda.id)
    .single()

  if (!pedido) return

  if (pedido.estado_interno === "cancelado") {
    console.log(`Webhook order/cancelled: pedido ${pedido.id} ya cancelado. Ignorando.`)
    return
  }

  const { cancelarPedido } = await import("@/lib/pedidos/cancelar-pedido")

  await cancelarPedido({
    pedido_id: pedido.id,
    motivo: "Cancelado desde Tienda Nube",
    notas: `Webhook order/cancelled — TN resource: ${resourceId} — Tienda: ${tienda.canal}`,
    origen: "webhook_tn",
    supabaseClient: supabase,
  })
}
