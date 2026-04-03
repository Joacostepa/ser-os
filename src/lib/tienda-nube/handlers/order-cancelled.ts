import type { WebhookContext } from "./index"

export async function handleOrderCancelled(ctx: WebhookContext) {
  const { supabase, tienda, resourceId } = ctx

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, estado_interno")
    .eq("tienda_nube_id", resourceId)
    .eq("tienda_id", tienda.id)
    .single()

  if (!pedido) return

  await supabase
    .from("pedidos")
    .update({
      estado_interno: "cancelado",
      estado_publico: "recibido",
    })
    .eq("id", pedido.id)

  await supabase.from("historial_pedido").insert({
    pedido_id: pedido.id,
    accion: `Pedido cancelado desde Tienda Nube (${tienda.canal})`,
    estado_anterior: pedido.estado_interno,
    estado_nuevo: "cancelado",
  })
}
