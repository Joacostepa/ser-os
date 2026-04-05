"use server"

import { createClient } from "@/lib/supabase/server"
import { crearAsiento } from "@/lib/contable/asientos"
import { ejecutarTransicion } from "@/lib/maquina-estados"
import { revalidatePath } from "next/cache"
import type { PagoInput } from "./tipos"
import { getSaldoPendiente, generarNumeroRecibo, conceptoPorTipo } from "./helpers"
import { descomponerIVA } from "@/lib/iva"

/**
 * Central function to register a payment for a pedido.
 *
 * Handles: validation, DB insert, accounting entries (venta + CMV + cobro),
 * estado_pago update, and state machine transitions.
 */
export async function registrarPago(input: PagoInput): Promise<{ pagoId: string }> {
  const supabase = await createClient()

  // 1. Get pedido data
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("id, monto_total, numero_tn, estado_interno, cliente:clientes(nombre)")
    .eq("id", input.pedido_id)
    .single()

  if (pedidoError || !pedido) {
    throw new Error("Pedido no encontrado")
  }

  const montoTotal = Number(pedido.monto_total)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clienteNombre = (pedido.cliente as any)?.nombre || "Cliente"
  const numeroPedido = pedido.numero_tn || pedido.id.slice(0, 8)

  // 2. Get saldo pendiente
  const saldo = await getSaldoPendiente(input.pedido_id)

  // 3. Validate
  if (input.monto <= 0) {
    throw new Error("El monto debe ser mayor a cero")
  }
  if (input.monto > saldo + 0.01) {
    throw new Error(
      `El monto ($${input.monto.toLocaleString("es-AR")}) supera el saldo pendiente ($${saldo.toLocaleString("es-AR")})`
    )
  }

  // 4. Check if first payment
  const { count: pagosExistentes } = await supabase
    .from("pagos")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", input.pedido_id)

  const esPrimerPago = (pagosExistentes ?? 0) === 0

  // 5. Generate numero_recibo for manual payments
  let numeroRecibo: string | null = null
  if (input.origen === "manual" && input.generar_recibo !== false) {
    try {
      numeroRecibo = await generarNumeroRecibo()
    } catch (err) {
      console.error("Error al generar numero de recibo:", err)
    }
  }

  // 6. Snapshot TC dólar blue
  let tcDolar: number | null = null
  try {
    const { getCotizacionVenta } = await import("@/lib/dolar-api")
    tcDolar = await getCotizacionVenta("blue")
  } catch { /* ignore */ }
  const montoUsd = tcDolar ? Math.round((input.monto / tcDolar) * 100) / 100 : null

  // 6b. INSERT into pagos
  const concepto = input.tipo_pago === "anticipo" || (esPrimerPago && input.tipo_pago !== "total")
    ? "sena"
    : input.tipo_pago === "total"
      ? "pago_total"
      : "saldo"

  const { data: pago, error: pagoError } = await supabase
    .from("pagos")
    .insert({
      tipo: "cobro" as const,
      pedido_id: input.pedido_id,
      cliente_id: input.cliente_id,
      monto: input.monto,
      metodo: input.metodo_pago,
      concepto,
      comprobante_url: input.comprobante_url || null,
      fecha: input.fecha,
      tc_dolar: tcDolar,
      monto_usd: montoUsd,
      notas: [
        conceptoPorTipo(input.tipo_pago, numeroPedido),
        input.observaciones,
        input.referencia_externa ? `Ref: ${input.referencia_externa}` : null,
        numeroRecibo ? `Recibo: ${numeroRecibo}` : null,
      ].filter(Boolean).join(" | ") || null,
    })
    .select("id")
    .single()

  if (pagoError || !pago) {
    throw new Error("Error al registrar el pago: " + (pagoError?.message ?? "desconocido"))
  }

  // 7. Accounting: venta + CMV (only on first payment, if no venta asiento exists)
  let asientoVentaId: number | null = null
  let asientoCMVId: number | null = null

  if (esPrimerPago) {
    try {
      // Check if venta asiento already exists for this pedido
      const { data: existingAsiento } = await supabase
        .from("asientos")
        .select("id")
        .eq("referencia_tipo", "pedido")
        .eq("referencia_id", input.pedido_id)
        .eq("tipo", "venta")
        .eq("anulado", false)
        .limit(1)

      if (!existingAsiento || existingAsiento.length === 0) {
        // Create venta asiento with IVA separation
        const { neto, iva } = descomponerIVA(montoTotal)
        asientoVentaId = await crearAsiento({
          fecha: input.fecha,
          descripcion: `Venta pedido #${numeroPedido} - ${clienteNombre}`,
          tipo: "venta",
          referencia_tipo: "pedido",
          referencia_id: input.pedido_id,
          lineas: [
            { cuenta_codigo: "1.1.2", debe: montoTotal, haber: 0, descripcion: "Cuentas a Cobrar" },
            { cuenta_codigo: "4.1.1", debe: 0, haber: neto, descripcion: "Ventas Mayoristas (neto)" },
            { cuenta_codigo: "2.1.4", debe: 0, haber: iva, descripcion: "IVA Débito Fiscal" },
          ],
        })

        // Calculate CMV using costeo library
        const { calcularCostoPedido } = await import("@/lib/costeo")
        const costeo = await calcularCostoPedido(input.pedido_id)
        const cmv = costeo.costo_total

        if (!costeo.pedido_costeo_completo) {
          console.warn(
            `CMV pedido #${numeroPedido}: costeo incompleto.`,
            costeo.alertas,
          )
        }

        if (cmv > 0) {
          // CMV asiento: CMV (5.1.1) debe / Inventario (1.1.3) haber
          asientoCMVId = await crearAsiento({
            fecha: input.fecha,
            descripcion: `CMV pedido #${numeroPedido}`,
            tipo: "venta",
            referencia_tipo: "pedido",
            referencia_id: input.pedido_id,
            lineas: [
              { cuenta_codigo: "5.1.1", debe: cmv, haber: 0, descripcion: `CMV pedido #${numeroPedido}` },
              { cuenta_codigo: "1.1.3", debe: 0, haber: cmv, descripcion: `CMV pedido #${numeroPedido}` },
            ],
          })
        }
      }
    } catch (err) {
      console.error("Error al crear asiento de venta/CMV:", err)
      throw new Error(`Error contable (venta): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 8. Always create cobro asiento: Caja/Banco (1.1.1) debe / Deudores (1.1.2) haber
  let asientoCobroId: number | null = null
  try {
    asientoCobroId = await crearAsiento({
      fecha: input.fecha,
      descripcion: `Cobro ${conceptoPorTipo(input.tipo_pago, numeroPedido)} - ${clienteNombre}`,
      tipo: "cobro",
      referencia_tipo: "pago",
      referencia_id: pago.id,
      lineas: [
        { cuenta_codigo: "1.1.1", debe: input.monto, haber: 0, descripcion: `Cobro pedido #${numeroPedido}` },
        { cuenta_codigo: "1.1.2", debe: 0, haber: input.monto, descripcion: `Cobro pedido #${numeroPedido}` },
      ],
    })
  } catch (err) {
    console.error("Error al crear asiento de cobro:", err)
    throw new Error(`Error contable (cobro): ${err instanceof Error ? err.message : String(err)}`)
  }

  // 9. Update pago record with asiento IDs (store in notas since pagos table may not have asiento_id)
  if (asientoCobroId || asientoVentaId || asientoCMVId) {
    const asientoInfo = [
      asientoVentaId ? `venta:${asientoVentaId}` : null,
      asientoCMVId ? `cmv:${asientoCMVId}` : null,
      asientoCobroId ? `cobro:${asientoCobroId}` : null,
    ].filter(Boolean).join(",")

    const currentNotas = pago.id ? (
      await supabase.from("pagos").select("notas").eq("id", pago.id).single()
    ).data?.notas : null

    const updatedNotas = [currentNotas, `[asientos: ${asientoInfo}]`].filter(Boolean).join(" | ")

    await supabase
      .from("pagos")
      .update({ notas: updatedNotas })
      .eq("id", pago.id)
  }

  // 10. Calculate new saldo and determine estado_pago
  const nuevoSaldo = saldo - input.monto
  let estadoPago: string

  if (nuevoSaldo <= 0) {
    estadoPago = "pagado"
  } else if (esPrimerPago) {
    estadoPago = "anticipo_recibido"
  } else {
    estadoPago = "parcial"
  }

  // 11. Update pedido.estado_pago + monto_pagado + saldo_pendiente
  const nuevoMontoPagado = montoTotal - nuevoSaldo
  await supabase
    .from("pedidos")
    .update({
      monto_pagado: Math.round(nuevoMontoPagado * 100) / 100,
      saldo_pendiente: Math.max(0, Math.round(nuevoSaldo * 100) / 100),
    })
    .eq("id", input.pedido_id)

  // 12. Evaluate state transitions
  try {
    const estadoActual = pedido.estado_interno as string

    // If nuevo/pendiente_de_sena/pendiente_sena -> habilitado
    if (
      ["nuevo", "pendiente_de_sena", "pendiente_sena"].includes(estadoActual)
    ) {
      await ejecutarTransicion(input.pedido_id, "habilitado")
    }

    // If pendiente_de_cobro/pendiente_saldo and fully paid -> listo_para_despachar
    if (
      ["pendiente_de_cobro", "pendiente_saldo"].includes(estadoActual) &&
      nuevoSaldo <= 0
    ) {
      await ejecutarTransicion(input.pedido_id, "listo_para_despachar")
    }
  } catch (err) {
    console.error("Error en transicion de estado post-pago:", err)
  }

  // Register in historial
  await supabase.from("historial_pedido").insert({
    pedido_id: input.pedido_id,
    accion: `Pago registrado: $${input.monto.toLocaleString("es-AR")} (${input.tipo_pago}) via ${input.metodo_pago}. Estado pago: ${estadoPago}`,
    datos: {
      pago_id: pago.id,
      monto: input.monto,
      tipo_pago: input.tipo_pago,
      metodo: input.metodo_pago,
      origen: input.origen,
      estado_pago: estadoPago,
      numero_recibo: numeroRecibo,
    },
  })

  // 13. Revalidate paths
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${input.pedido_id}`)
  revalidatePath("/finanzas")

  return { pagoId: pago.id }
}
