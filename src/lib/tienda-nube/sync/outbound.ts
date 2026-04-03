"use server"

import { createClient } from "@supabase/supabase-js"
import { createTNClientForTienda } from "../factory"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Mark order as packed in Tienda Nube
 */
export async function syncPedidoPacked(pedidoId: string) {
  const supabase = getAdminClient()

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("tienda_nube_id, tienda_id")
    .eq("id", pedidoId)
    .single()

  if (!pedido?.tienda_nube_id || !pedido?.tienda_id) return

  const { client } = await createTNClientForTienda(pedido.tienda_id)

  // Get fulfillment orders
  const foResult = await client.getFulfillmentOrders(pedido.tienda_nube_id)
  if (!foResult.ok || !foResult.data.length) return

  const fo = foResult.data[0]
  if (fo.status === "PACKED" || fo.status === "SHIPPED" || fo.status === "DELIVERED") return

  const result = await client.updateFulfillmentStatus(
    pedido.tienda_nube_id,
    fo.id,
    "PACKED"
  )

  await supabase.from("historial_pedido").insert({
    pedido_id: pedidoId,
    accion: result.ok
      ? "Marcado como empaquetado en Tienda Nube"
      : `Error al sincronizar con TN: ${!result.ok ? result.error : ""}`,
  })

  return result.ok
}

/**
 * Mark order as shipped with tracking in Tienda Nube
 */
export async function syncPedidoShipped(
  pedidoId: string,
  tracking: {
    trackingNumber: string
    trackingUrl?: string
    carrier?: string
  }
) {
  const supabase = getAdminClient()

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("tienda_nube_id, tienda_id")
    .eq("id", pedidoId)
    .single()

  if (!pedido?.tienda_nube_id || !pedido?.tienda_id) return

  const { client } = await createTNClientForTienda(pedido.tienda_id)

  const foResult = await client.getFulfillmentOrders(pedido.tienda_nube_id)
  if (!foResult.ok || !foResult.data.length) return

  const fo = foResult.data[0]

  // First pack if not already packed
  if (fo.status === "UNPACKED") {
    await client.updateFulfillmentStatus(pedido.tienda_nube_id, fo.id, "PACKED")
  }

  // Then create tracking event
  const result = await client.createTrackingEvent(
    pedido.tienda_nube_id,
    fo.id,
    {
      status: "shipped",
      happened_at: new Date().toISOString(),
      description: tracking.carrier ? `Enviado por ${tracking.carrier}` : "Pedido enviado",
      tracking_number: tracking.trackingNumber,
      tracking_url: tracking.trackingUrl,
    }
  )

  // Save tracking in datos_envio
  await supabase
    .from("pedidos")
    .update({
      datos_envio: {
        tracking: tracking.trackingNumber,
        tracking_url: tracking.trackingUrl,
        correo: tracking.carrier,
      },
    })
    .eq("id", pedidoId)

  await supabase.from("historial_pedido").insert({
    pedido_id: pedidoId,
    accion: result.ok
      ? `Envío informado a TN — Tracking: ${tracking.trackingNumber}`
      : `Error al informar envío a TN: ${!result.ok ? result.error : ""}`,
  })

  return result.ok
}

/**
 * Mark order as delivered in Tienda Nube
 */
export async function syncPedidoDelivered(pedidoId: string) {
  const supabase = getAdminClient()

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("tienda_nube_id, tienda_id")
    .eq("id", pedidoId)
    .single()

  if (!pedido?.tienda_nube_id || !pedido?.tienda_id) return

  const { client } = await createTNClientForTienda(pedido.tienda_id)

  const foResult = await client.getFulfillmentOrders(pedido.tienda_nube_id)
  if (!foResult.ok || !foResult.data.length) return

  const fo = foResult.data[0]

  const result = await client.createTrackingEvent(
    pedido.tienda_nube_id,
    fo.id,
    {
      status: "delivered",
      happened_at: new Date().toISOString(),
    }
  )

  await supabase.from("historial_pedido").insert({
    pedido_id: pedidoId,
    accion: result.ok
      ? "Marcado como entregado en Tienda Nube"
      : `Error al marcar entregado en TN: ${!result.ok ? result.error : ""}`,
  })

  return result.ok
}

/**
 * Sync variant stock to Tienda Nube (all connected stores)
 */
export async function syncVariantStock(varianteId: string, newStock: number) {
  const supabase = getAdminClient()

  // Find all store-variant junctions
  const { data: junctions } = await supabase
    .from("variantes_tienda")
    .select("tienda_id, tienda_nube_variant_id, variante:variantes(producto_id)")
    .eq("variante_id", varianteId)

  if (!junctions?.length) return

  for (const junction of junctions) {
    // Find the TN product ID for this store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productoId = (junction.variante as any)?.producto_id
    if (!productoId) continue

    const { data: prodJunction } = await supabase
      .from("productos_tienda")
      .select("tienda_nube_product_id")
      .eq("producto_id", productoId)
      .eq("tienda_id", junction.tienda_id)
      .single()

    if (!prodJunction) continue

    try {
      const { client } = await createTNClientForTienda(junction.tienda_id)
      await client.updateVariantStock(
        prodJunction.tienda_nube_product_id,
        junction.tienda_nube_variant_id,
        newStock
      )
    } catch (err) {
      console.error(`Failed to sync stock to store ${junction.tienda_id}:`, err)
    }
  }
}
