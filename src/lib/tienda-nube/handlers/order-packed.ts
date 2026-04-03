import type { WebhookContext } from "./index"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"

export async function handleOrderPacked(ctx: WebhookContext) {
  const { supabase, tienda, resourceId } = ctx

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, estado_interno")
    .eq("tienda_nube_id", resourceId)
    .eq("tienda_id", tienda.id)
    .single()

  if (!pedido) return

  const nuevoEstado = "armado_completo" as const

  await supabase
    .from("pedidos")
    .update({
      estado_interno: nuevoEstado,
      estado_publico: ESTADO_INTERNO_A_PUBLICO[nuevoEstado],
    })
    .eq("id", pedido.id)
}
