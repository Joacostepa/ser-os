import type { WebhookContext } from "./index"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"
import { descomponerIVA } from "@/lib/iva"

export async function handleOrderPaid(ctx: WebhookContext) {
  const { client, supabase, tienda, resourceId } = ctx

  const orderResult = await client.getOrder(resourceId)
  if (!orderResult.ok) {
    throw new Error(`Failed to fetch order ${resourceId}: ${orderResult.error}`)
  }
  const order = orderResult.data

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, tipo, monto_total, estado_interno, cliente_id, numero_tn")
    .eq("tienda_nube_id", String(order.id))
    .eq("tienda_id", tienda.id)
    .single()

  if (!pedido) return

  const montoTotal = parseFloat(order.total || "0")
  const numeroPedido = pedido.numero_tn || pedido.id.slice(0, 8)

  // ═══ IDEMPOTENCIA: verificar si ya procesamos este pago ═══
  const paymentId = String(order.id)
  const { data: pagoExistente } = await supabase
    .from("pagos")
    .select("id")
    .eq("pedido_id", pedido.id)
    .eq("tienda_nube_payment_id", paymentId)
    .maybeSingle()

  if (pagoExistente) {
    console.log(`Webhook order/paid ya procesado para pedido ${pedido.id}. Ignorando.`)
    return
  }

  // Verificar saldo (capa 1 anti-duplicado)
  const { data: pagosAnteriores } = await supabase
    .from("pagos")
    .select("monto")
    .eq("pedido_id", pedido.id)

  const totalPagado = (pagosAnteriores || []).reduce((s, p) => s + Number(p.monto), 0)
  const saldoPendiente = Number(pedido.monto_total) - totalPagado

  if (saldoPendiente <= 0.01) {
    console.log(`Pedido ${pedido.id} ya está pagado. Ignorando webhook order/paid.`)
    return
  }

  const montoAPagar = Math.min(montoTotal, saldoPendiente)
  const esPrimerPago = (pagosAnteriores?.length ?? 0) === 0

  // ═══ 1. Mapear gateway y calcular comisión ═══
  const { calcularComision } = await import("@/lib/comisiones/calcular-comision")
  const { mapearGatewayTN } = await import("@/lib/comisiones/mapear-gateway")

  const metodoComision = mapearGatewayTN(
    order.gateway || "",
    order.payment_details?.method,
  )

  let comision = { total_comisiones: 0, monto_neto_recibido: montoAPagar, comision_pasarela_neta: 0, comision_tn: 0, iva_comision_pasarela: 0, metodo_pago: metodoComision, monto_bruto: montoAPagar, tasa_pasarela: 0, comision_pasarela_total: 0, tasa_tn: 0 }
  try {
    comision = await calcularComision(supabase, montoAPagar, metodoComision, "tienda_nube")
  } catch (err) {
    console.error("Error al calcular comisión en order/paid:", err)
  }

  // ═══ 2. Crear registro en tabla pagos ═══
  // Snapshot TC dólar
  let tcDolar: number | null = null
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue")
    if (res.ok) {
      const data = await res.json()
      tcDolar = data.venta || null
    }
  } catch { /* ignore */ }
  const montoUsd = tcDolar ? Math.round((montoAPagar / tcDolar) * 100) / 100 : null

  const { data: pago } = await supabase
    .from("pagos")
    .insert({
      tipo: "cobro",
      pedido_id: pedido.id,
      cliente_id: pedido.cliente_id,
      monto: montoAPagar,
      metodo: metodoComision,
      concepto: "pago_total",
      fecha: new Date().toISOString().split("T")[0],
      origen: "tienda_nube",
      tienda_nube_payment_id: paymentId,
      tc_dolar: tcDolar,
      monto_usd: montoUsd,
      notas: `Pago automático desde Tienda Nube (${tienda.canal}) — gateway: ${order.gateway || "N/A"}`,
    })
    .select("id")
    .single()

  // ═══ 3. Guardar comisión vinculada al pago ═══
  if (comision.total_comisiones > 0 && pago) {
    await supabase.from("comisiones_pedido").insert({
      pedido_id: pedido.id,
      pago_id: pago.id,
      ...comision,
    })
  }

  // ═══ 4. Asiento de venta (solo primer pago) ═══
  if (esPrimerPago) {
    try {
      // Verificar que no exista ya
      const { data: asientoExistente } = await supabase
        .from("asientos")
        .select("id")
        .eq("referencia_tipo", "pedido")
        .eq("referencia_id", pedido.id)
        .eq("tipo", "venta")
        .eq("anulado", false)
        .limit(1)

      if (!asientoExistente || asientoExistente.length === 0) {
        const montoTotalPedido = Number(pedido.monto_total)
        const { neto, iva } = descomponerIVA(montoTotalPedido)

        await supabase.rpc("crear_asiento_contable", {
          p_fecha: new Date().toISOString().split("T")[0],
          p_descripcion: `Venta pedido #${numeroPedido} — webhook TN`,
          p_tipo: "venta",
          p_referencia_tipo: "pedido",
          p_referencia_id: pedido.id,
          p_usuario_id: null,
          p_lineas: [
            { cuenta_codigo: "1.1.2", debe: montoTotalPedido, haber: 0, descripcion: "Cuentas a Cobrar" },
            { cuenta_codigo: "4.1.1", debe: 0, haber: neto, descripcion: "Ventas Mayoristas (neto)" },
            { cuenta_codigo: "2.1.4", debe: 0, haber: iva, descripcion: "IVA Débito Fiscal" },
          ],
        })
      }
    } catch (err) {
      console.error("Error al crear asiento de venta en order/paid:", err)
    }
  }

  // ═══ 5. Asiento de cobro (siempre, con split de comisiones) ═══
  try {
    const lineas = []

    if (comision.total_comisiones > 0) {
      lineas.push(
        { cuenta_codigo: "1.1.1", debe: comision.monto_neto_recibido, haber: 0, descripcion: `Cobro pedido #${numeroPedido} (neto)` },
        { cuenta_codigo: "6.2.5", debe: comision.comision_pasarela_neta + comision.comision_tn, haber: 0, descripcion: `Comisión pasarela pedido #${numeroPedido}` },
      )
      if (comision.iva_comision_pasarela > 0) {
        lineas.push(
          { cuenta_codigo: "1.1.5", debe: comision.iva_comision_pasarela, haber: 0, descripcion: `IVA CF comisión pedido #${numeroPedido}` },
        )
      }
      lineas.push(
        { cuenta_codigo: "1.1.2", debe: 0, haber: montoAPagar, descripcion: `Cobro pedido #${numeroPedido}` },
      )
    } else {
      lineas.push(
        { cuenta_codigo: "1.1.1", debe: montoAPagar, haber: 0, descripcion: `Cobro pedido #${numeroPedido}` },
        { cuenta_codigo: "1.1.2", debe: 0, haber: montoAPagar, descripcion: `Cobro pedido #${numeroPedido}` },
      )
    }

    await supabase.rpc("crear_asiento_contable", {
      p_fecha: new Date().toISOString().split("T")[0],
      p_descripcion: `Cobro pedido #${numeroPedido} — webhook TN`,
      p_tipo: "cobro",
      p_referencia_tipo: "pago",
      p_referencia_id: pago?.id || pedido.id,
      p_usuario_id: null,
      p_lineas: lineas,
    })
  } catch (err) {
    console.error("Error al crear asiento de cobro en order/paid:", err)
  }

  // ═══ 6. Actualizar pedido ═══
  const nuevoEstado = "sena_recibida" as const
  const nuevoMontoPagado = totalPagado + montoAPagar
  const nuevoSaldo = Number(pedido.monto_total) - nuevoMontoPagado

  await supabase
    .from("pedidos")
    .update({
      monto_total: montoTotal,
      monto_pagado: Math.round(nuevoMontoPagado * 100) / 100,
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
    accion: `Pago confirmado desde Tienda Nube (${tienda.canal}) — $${montoAPagar.toLocaleString("es-AR")} via ${metodoComision}`,
    estado_anterior: pedido.estado_interno,
    estado_nuevo: nuevoEstado,
  })
}
