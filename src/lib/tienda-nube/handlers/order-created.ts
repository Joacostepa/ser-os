import type { WebhookContext } from "./index"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"

export async function handleOrderCreated(ctx: WebhookContext) {
  const { client, supabase, tienda, resourceId } = ctx

  // Fetch full order from TN API
  const orderResult = await client.getOrder(resourceId)
  if (!orderResult.ok) {
    throw new Error(`Failed to fetch order ${resourceId}: ${orderResult.error}`)
  }
  const order = orderResult.data

  // Check if order already exists for this tienda
  const { data: existing } = await supabase
    .from("pedidos")
    .select("id")
    .eq("tienda_nube_id", String(order.id))
    .eq("tienda_id", tienda.id)
    .single()

  if (existing) return // Already processed

  // Find or create customer (dedup by email across stores)
  const clienteId = await findOrCreateCliente(ctx, order)

  // Determine order type
  // Default: estandar. Can be reclassified manually later.
  const tipo = "estandar" as const

  // Determine payment status
  const isPaid = order.payment_status === "paid"
  const estadoInterno: EstadoInterno = isPaid ? "sena_recibida" : "nuevo"
  const estadoPublico = ESTADO_INTERNO_A_PUBLICO[estadoInterno]

  const montoTotal = parseFloat(order.total || "0")
  const montoPagado = isPaid ? montoTotal : 0

  // Create order
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      numero_tn: String(order.number),
      tienda_nube_id: String(order.id),
      tienda_id: tienda.id,
      cliente_id: clienteId,
      tipo,
      estado_interno: estadoInterno,
      estado_publico: estadoPublico,
      prioridad: "normal",
      monto_total: montoTotal,
      monto_pagado: montoPagado,
      fecha_ingreso: order.created_at,
      tipo_despacho: order.shipping_address ? "envio" : "retiro_oficina",
      datos_envio: order.shipping_address,
      observaciones: order.note || null,
    })
    .select()
    .single()

  if (pedidoError) throw pedidoError

  // Create items from order products
  if (order.products?.length > 0) {
    const items = order.products.map((p) => ({
      pedido_id: pedido.id,
      descripcion: p.name || "Producto",
      cantidad: p.quantity || 1,
      precio_unitario: parseFloat(p.price) || 0,
      producto_id: null as string | null,
      variante_id: null as string | null,
    }))

    // Try to link items to local products
    for (const item of items) {
      const tnProduct = order.products.find((p) => p.name === item.descripcion)
      if (tnProduct) {
        // Look up local product by TN product ID and tienda
        const { data: productoTienda } = await supabase
          .from("productos_tienda")
          .select("producto_id")
          .eq("tienda_id", tienda.id)
          .eq("tienda_nube_product_id", String(tnProduct.product_id))
          .single()

        if (productoTienda) {
          item.producto_id = productoTienda.producto_id
        }

        if (tnProduct.variant_id) {
          const { data: varianteTienda } = await supabase
            .from("variantes_tienda")
            .select("variante_id")
            .eq("tienda_id", tienda.id)
            .eq("tienda_nube_variant_id", String(tnProduct.variant_id))
            .single()

          if (varianteTienda) {
            item.variante_id = varianteTienda.variante_id
          }
        }
      }
    }

    await supabase.from("items_pedido").insert(items)
  }

  // Log in history
  await supabase.from("historial_pedido").insert({
    pedido_id: pedido.id,
    accion: `Pedido ingresado desde Tienda Nube (${tienda.canal})`,
    estado_nuevo: estadoInterno,
  })

  // If paid, generate tasks
  if (isPaid) {
    await supabase.rpc("generar_tareas_pedido", {
      p_pedido_id: pedido.id,
      p_tipo: tipo,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateCliente(ctx: WebhookContext, order: any): Promise<string> {
  const { supabase, tienda } = ctx

  const email = order.contact_email || order.customer?.email
  const nombre = order.contact_name || order.customer?.name || "Sin nombre"
  const telefono = order.contact_phone || order.customer?.phone
  const cuit = order.contact_identification || order.customer?.identification
  const tnCustomerId = order.customer?.id ? String(order.customer.id) : null

  // Try to find existing client by email (dedup across stores)
  let clienteId: string | null = null

  if (email) {
    const { data: existingCliente } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", email)
      .limit(1)
      .single()

    if (existingCliente) {
      clienteId = existingCliente.id
    }
  }

  // If not found by email, check by TN customer ID in junction table
  if (!clienteId && tnCustomerId) {
    const { data: junction } = await supabase
      .from("clientes_tienda")
      .select("cliente_id")
      .eq("tienda_id", tienda.id)
      .eq("tienda_nube_customer_id", tnCustomerId)
      .single()

    if (junction) {
      clienteId = junction.cliente_id
    }
  }

  // Create new client if not found
  if (!clienteId) {
    const { data: newCliente, error } = await supabase
      .from("clientes")
      .insert({
        nombre,
        email: email || null,
        telefono: telefono || null,
        cuit: cuit || null,
        categoria: "nuevo",
      })
      .select("id")
      .single()

    if (error) throw error
    clienteId = newCliente.id
  }

  // Ensure junction record exists
  if (tnCustomerId) {
    await supabase
      .from("clientes_tienda")
      .upsert(
        {
          cliente_id: clienteId,
          tienda_id: tienda.id,
          tienda_nube_customer_id: tnCustomerId,
        },
        { onConflict: "tienda_id,tienda_nube_customer_id" }
      )
  }

  return clienteId!
}
