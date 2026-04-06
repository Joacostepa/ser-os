"use server"

import { createClient } from "@/lib/supabase/server"
import { anularAsiento } from "@/lib/contable/asientos"
import { revalidatePath } from "next/cache"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"

interface CancelarPedidoInput {
  pedido_id: string
  motivo: string
  notas?: string
  origen: "manual" | "webhook_tn"
  usuario_id?: string
  devolver_saldo?: boolean
  devolucion_metodo?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
}

interface CancelarPedidoResult {
  ok: boolean
  saldo_favor?: number
  comision_perdida?: number
  error?: string
}

const MOTIVOS_CANCELACION = [
  "Clienta desistió de la compra",
  "Falta de stock",
  "Error en el pedido",
  "Pedido duplicado",
  "No se pudo contactar a la clienta",
  "Cancelado desde Tienda Nube",
  "Otro",
]

export { MOTIVOS_CANCELACION }

export async function cancelarPedido(input: CancelarPedidoInput): Promise<CancelarPedidoResult> {
  const supabase = input.supabaseClient || await createClient()

  // ═══ 1. OBTENER PEDIDO ═══
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("id, monto_total, numero_tn, numero_interno, estado_interno, cliente_id, cliente:clientes(nombre)")
    .eq("id", input.pedido_id)
    .single()

  if (pedidoError || !pedido) {
    return { ok: false, error: "Pedido no encontrado" }
  }

  // ═══ 2. VALIDAR ═══
  if (pedido.estado_interno === "cancelado") {
    return { ok: false, error: "El pedido ya está cancelado" }
  }

  if (["despachado", "entregado"].includes(pedido.estado_interno)) {
    return { ok: false, error: "No se puede cancelar un pedido que ya fue despachado o entregado" }
  }

  const numeroPedido = pedido.numero_tn || pedido.numero_interno || pedido.id.slice(0, 8)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clienteNombre = (pedido.cliente as any)?.nombre || "Cliente"

  // ═══ 3. CAMBIAR ESTADO ═══
  await supabase.from("pedidos").update({
    estado_interno: "cancelado",
    estado_publico: ESTADO_INTERNO_A_PUBLICO["cancelado"] || "recibido",
    cancelado_en: new Date().toISOString(),
    cancelado_por: input.usuario_id || null,
    cancelacion_motivo: input.motivo,
    cancelacion_notas: input.notas || null,
    cancelacion_origen: input.origen,
  }).eq("id", input.pedido_id)

  // ═══ 4. CANCELAR TAREAS PENDIENTES ═══
  await supabase
    .from("tareas")
    .update({ estado: "cancelada" })
    .eq("pedido_id", input.pedido_id)
    .in("estado", ["pendiente", "en_proceso", "asignada"])

  // ═══ 5. LIBERAR STOCK RESERVADO ═══
  const { data: itemsPedido } = await supabase
    .from("items_pedido")
    .select("variante_id, cantidad")
    .eq("pedido_id", input.pedido_id)
    .not("variante_id", "is", null)

  for (const item of itemsPedido || []) {
    if (item.variante_id) {
      const { data: variante } = await supabase
        .from("variantes")
        .select("stock_reservado")
        .eq("id", item.variante_id)
        .single()

      if (variante && Number(variante.stock_reservado) > 0) {
        const nuevoReservado = Math.max(0, Number(variante.stock_reservado) - Number(item.cantidad))
        await supabase.from("variantes").update({ stock_reservado: nuevoReservado }).eq("id", item.variante_id)
      }
    }
  }

  // ═══ 6. REVERTIR ASIENTOS CONTABLES ═══
  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto")
    .eq("pedido_id", input.pedido_id)

  const totalPagado = (pagos || []).reduce((s: number, p: { monto: number }) => s + Number(p.monto), 0)
  let comisionPerdida = 0

  if (totalPagado > 0) {
    // Anular asientos de venta vinculados al pedido
    const { data: asientosVenta } = await supabase
      .from("asientos")
      .select("id")
      .eq("referencia_tipo", "pedido")
      .eq("referencia_id", input.pedido_id)
      .eq("anulado", false)

    for (const a of asientosVenta || []) {
      try { await anularAsiento(a.id) } catch (err) {
        console.error(`Error anulando asiento ${a.id}:`, err)
      }
    }

    // Anular asientos de cobro vinculados a los pagos
    const pagoIds = (pagos || []).map((p: { id: string }) => p.id)
    if (pagoIds.length > 0) {
      const { data: asientosCobro } = await supabase
        .from("asientos")
        .select("id")
        .eq("referencia_tipo", "pago")
        .in("referencia_id", pagoIds)
        .eq("anulado", false)

      for (const a of asientosCobro || []) {
        try { await anularAsiento(a.id) } catch (err) {
          console.error(`Error anulando asiento cobro ${a.id}:`, err)
        }
      }
    }

    // Calcular comisión perdida
    const { data: comisiones } = await supabase
      .from("comisiones_pedido")
      .select("total_comisiones")
      .eq("pedido_id", input.pedido_id)

    comisionPerdida = (comisiones || []).reduce((s: number, c: { total_comisiones: number }) => s + Number(c.total_comisiones), 0)
  }

  // ═══ 7. GENERAR SALDO A FAVOR ═══
  if (totalPagado > 0) {
    await supabase.from("saldos_favor_clientes").insert({
      cliente_id: pedido.cliente_id,
      pedido_origen_id: input.pedido_id,
      monto_original: totalPagado,
      monto_disponible: totalPagado,
      estado: input.devolver_saldo ? "devuelto" : "pendiente",
      devuelto_en: input.devolver_saldo ? new Date().toISOString() : null,
      devuelto_metodo: input.devolver_saldo ? (input.devolucion_metodo || "transferencia") : null,
    })

    await supabase.from("pedidos").update({
      cancelacion_tiene_pagos: true,
      cancelacion_saldo_favor: totalPagado,
    }).eq("id", input.pedido_id)
  }

  // ═══ 8. HISTORIAL ═══
  await supabase.from("historial_pedido").insert({
    pedido_id: input.pedido_id,
    accion: `Pedido cancelado: ${input.motivo}${totalPagado > 0 ? ` · Saldo a favor: $${totalPagado.toLocaleString("es-AR")}` : ""}`,
    estado_anterior: pedido.estado_interno,
    estado_nuevo: "cancelado",
    datos: {
      motivo: input.motivo,
      origen: input.origen,
      saldo_favor: totalPagado,
      comision_perdida: comisionPerdida,
    },
  })

  // ═══ 9. NOTIFICAR ═══
  try {
    const { crearNotificacion } = await import("@/lib/notificaciones/crear-notificacion")
    await crearNotificacion({
      tipo: "pedido_cancelado",
      datos: {
        numero: numeroPedido,
        cliente: clienteNombre,
        motivo: input.motivo,
        saldo_favor: totalPagado,
        origen: input.origen,
      },
      recurso_id: input.pedido_id,
      supabaseClient: input.supabaseClient,
    })
  } catch { /* ignore */ }

  // ═══ 10. REVALIDATE ═══
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${input.pedido_id}`)
  revalidatePath("/finanzas")

  return {
    ok: true,
    saldo_favor: totalPagado > 0 ? totalPagado : undefined,
    comision_perdida: comisionPerdida > 0 ? comisionPerdida : undefined,
  }
}
