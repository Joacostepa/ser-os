import type { WebhookContext } from "./index"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"
import { getCotizacionVenta } from "@/lib/dolar-api"
import { calcularNeto, calcularIVA } from "@/lib/iva"
import { guardarSnapshot } from "@/lib/pedidos/snapshot-tn"

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

  // Orders arrive as sin_clasificar — Sheila must classify before enabling
  const tipo = "sin_clasificar"

  // Determine payment status
  // Paid orders stay in 'nuevo' (not auto-habilitado) until classified
  // Unpaid orders go to 'pendiente_sena'
  const isPaid = order.payment_status === "paid"
  const estadoInterno: EstadoInterno = isPaid ? "nuevo" : "pendiente_sena"
  const estadoPublico = ESTADO_INTERNO_A_PUBLICO[estadoInterno]

  const montoTotal = parseFloat(order.total || "0")
  const montoPagado = isPaid ? montoTotal : 0

  // Snapshot cotización USD
  const cotizacionUsd = await getCotizacionVenta("blue")
  const montoTotalUsd = cotizacionUsd ? Math.round((montoTotal / cotizacionUsd) * 100) / 100 : null

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
      monto_neto: calcularNeto(montoTotal),
      monto_iva: calcularIVA(montoTotal),
      monto_pagado: montoPagado,
      fecha_ingreso: order.created_at,
      tipo_despacho: order.shipping_address ? "envio" : "retiro_oficina",
      datos_envio: order.shipping_address,
      observaciones: order.note || null,
      cotizacion_usd: cotizacionUsd,
      cotizacion_tipo: "blue",
      monto_total_usd: montoTotalUsd,
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
      precio_neto: calcularNeto(parseFloat(p.price) || 0),
      iva_unitario: calcularIVA(parseFloat(p.price) || 0),
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

    // Save original TN snapshot
    await guardarSnapshot(
      pedido.id,
      items.map((i) => ({
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        producto_id: i.producto_id,
        variante_id: i.variante_id,
      })),
      montoTotal,
      calcularNeto(montoTotal)
    )
  }

  // Save coupons used (for Club SER tracking)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cuponesUsados = (order as any).coupon
    ? (Array.isArray((order as any).coupon) ? (order as any).coupon : [(order as any).coupon])
    : []
  if (cuponesUsados.length > 0) {
    await supabase.from("pedidos").update({ cupones_usados: cuponesUsados }).eq("id", pedido.id)
  }

  // Log in history
  await supabase.from("historial_pedido").insert({
    pedido_id: pedido.id,
    accion: `Pedido ingresado desde Tienda Nube (${tienda.canal})`,
    estado_nuevo: estadoInterno,
  })

  // If order arrived already paid, create pago + asientos
  if (isPaid && montoTotal > 0) {
    try {
      const { calcularComision } = await import("@/lib/comisiones/calcular-comision")
      const { mapearGatewayTN } = await import("@/lib/comisiones/mapear-gateway")
      const { descomponerIVA } = await import("@/lib/iva")

      const metodoComision = mapearGatewayTN(order.gateway || "", order.payment_details?.method)
      const paymentId = String(order.id)
      const fechaHoy = new Date().toISOString().split("T")[0]
      const numeroPedido = String(order.number)

      // Snapshot TC dólar
      let tcDolar: number | null = null
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares/blue")
        if (res.ok) { tcDolar = (await res.json()).venta || null }
      } catch { /* ignore */ }
      const montoUsd = tcDolar ? Math.round((montoTotal / tcDolar) * 100) / 100 : null

      // Create pago record
      const { data: pago } = await supabase.from("pagos").insert({
        tipo: "cobro",
        pedido_id: pedido.id,
        cliente_id: clienteId,
        monto: montoTotal,
        metodo: metodoComision,
        concepto: "pago_total",
        fecha: fechaHoy,
        origen: "tienda_nube",
        tienda_nube_payment_id: paymentId,
        tc_dolar: tcDolar,
        monto_usd: montoUsd,
        notas: `Pago automático — order/created ya pagado — gateway: ${order.gateway || "N/A"}`,
      }).select("id").single()

      // Calculate and save commission
      let comision = { total_comisiones: 0, monto_neto_recibido: montoTotal, comision_pasarela_neta: 0, comision_tn: 0, iva_comision_pasarela: 0 }
      try {
        const c = await calcularComision(supabase, montoTotal, metodoComision, "tienda_nube")
        comision = c
        if (c.total_comisiones > 0 && pago) {
          await supabase.from("comisiones_pedido").insert({ pedido_id: pedido.id, pago_id: pago.id, ...c })
        }
      } catch { /* ignore */ }

      // Asiento de venta
      const { neto, iva } = descomponerIVA(montoTotal)
      await supabase.rpc("crear_asiento_contable", {
        p_fecha: fechaHoy,
        p_descripcion: `Venta pedido #${numeroPedido} — webhook TN`,
        p_tipo: "venta",
        p_referencia_tipo: "pedido",
        p_referencia_id: pedido.id,
        p_usuario_id: null,
        p_lineas: [
          { cuenta_codigo: "1.1.2", debe: montoTotal, haber: 0, descripcion: "Cuentas a Cobrar" },
          { cuenta_codigo: "4.1.1", debe: 0, haber: neto, descripcion: "Ventas Mayoristas (neto)" },
          { cuenta_codigo: "2.1.4", debe: 0, haber: iva, descripcion: "IVA Débito Fiscal" },
        ],
      })

      // Asiento de cobro (with commission split)
      const lineas = []
      if (comision.total_comisiones > 0) {
        lineas.push(
          { cuenta_codigo: "1.1.1", debe: comision.monto_neto_recibido, haber: 0, descripcion: `Cobro pedido #${numeroPedido} (neto)` },
          { cuenta_codigo: "6.2.5", debe: comision.comision_pasarela_neta + comision.comision_tn, haber: 0, descripcion: `Comisión pasarela pedido #${numeroPedido}` },
        )
        if (comision.iva_comision_pasarela > 0) {
          lineas.push({ cuenta_codigo: "1.1.5", debe: comision.iva_comision_pasarela, haber: 0, descripcion: `IVA CF comisión pedido #${numeroPedido}` })
        }
        lineas.push({ cuenta_codigo: "1.1.2", debe: 0, haber: montoTotal, descripcion: `Cobro pedido #${numeroPedido}` })
      } else {
        lineas.push(
          { cuenta_codigo: "1.1.1", debe: montoTotal, haber: 0, descripcion: `Cobro pedido #${numeroPedido}` },
          { cuenta_codigo: "1.1.2", debe: 0, haber: montoTotal, descripcion: `Cobro pedido #${numeroPedido}` },
        )
      }
      await supabase.rpc("crear_asiento_contable", {
        p_fecha: fechaHoy,
        p_descripcion: `Cobro pedido #${numeroPedido} — webhook TN`,
        p_tipo: "cobro",
        p_referencia_tipo: "pago",
        p_referencia_id: pago?.id || pedido.id,
        p_usuario_id: null,
        p_lineas: lineas,
      })
    } catch (err) {
      console.error("Error al crear pago/asientos en order/created (paid):", err)
    }
  }

  // Notify pedido nuevo
  try {
    const clienteNombre = order.contact_name || order.customer?.name || "Sin nombre"
    const { crearNotificacion } = await import("@/lib/notificaciones/crear-notificacion")
    await crearNotificacion({
      tipo: "pedido_nuevo",
      datos: {
        numero: String(order.number),
        cliente: clienteNombre,
        monto: montoTotal,
        items_count: order.products?.length || 0,
      },
      recurso_id: pedido.id,
      supabaseClient: supabase,
    })
  } catch { /* ignore notification errors */ }

  // Tasks are generated after classification + habilitacion, not on order creation
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
