"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Evalúa una condición individual contra el estado actual del pedido en la DB.
 * Devuelve true si la condición se cumple, false si no.
 */
export async function evaluarCondicion(
  pedidoId: string,
  condicion: string,
): Promise<boolean> {
  const supabase = await createClient()

  switch (condicion) {
    // ── Condiciones de pago ─────────────────────────────────────────
    case "pago_total_recibido":
    case "pago_completo": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("monto_total, monto_pagado")
        .eq("id", pedidoId)
        .single()

      if (!pedido) return false
      return pedido.monto_pagado >= pedido.monto_total - 0.01
    }

    case "pago_anticipo_registrado": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("monto_pagado")
        .eq("id", pedidoId)
        .single()

      if (!pedido) return false
      return pedido.monto_pagado > 0
    }

    case "pago_incompleto": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("monto_total, monto_pagado")
        .eq("id", pedidoId)
        .single()

      if (!pedido) return false
      return pedido.monto_pagado < pedido.monto_total - 0.01
    }

    // ── Condiciones de tareas ───────────────────────────────────────
    case "todas_tareas_prearmado_completadas": {
      const { data: tareas } = await supabase
        .from("tareas")
        .select("id, estado, area")
        .eq("pedido_id", pedidoId)
        .in("area", ["diseno", "operaciones"])

      if (!tareas || tareas.length === 0) return true
      return tareas.every((t) => t.estado === "terminada")
    }

    case "todas_tareas_armado_completadas": {
      const { data: tareas } = await supabase
        .from("tareas")
        .select("id, estado")
        .eq("pedido_id", pedidoId)
        .eq("area", "armado")

      if (!tareas || tareas.length === 0) return true
      return tareas.every((t) => t.estado === "terminada")
    }

    case "sin_tareas_pendientes": {
      const { count } = await supabase
        .from("tareas")
        .select("id", { count: "exact", head: true })
        .eq("pedido_id", pedidoId)
        .neq("estado", "terminada")

      return (count ?? 0) === 0
    }

    // ── Condiciones de envío ────────────────────────────────────────
    case "datos_envio_completos": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("tipo_despacho, datos_envio")
        .eq("id", pedidoId)
        .single()

      if (!pedido || !pedido.tipo_despacho) return false
      if (pedido.tipo_despacho === "retiro_oficina") return true
      return pedido.datos_envio !== null
    }

    // ── Condiciones de clasificación ──────────────────────────────────
    case "tipo_clasificado": {
      const { data: p } = await supabase
        .from("pedidos")
        .select("tipo")
        .eq("id", pedidoId)
        .single()

      return p?.tipo !== "sin_clasificar" && p?.tipo !== null
    }

    // ── Condiciones validadas en frontend (siempre true) ────────────
    case "confirmacion_usuario":
    case "motivo_cancelacion":
    case "motivo_bloqueo":
    case "motivo_desbloqueo_resuelto":
      return true

    default:
      console.warn(`[maquina-estados] Condición desconocida: "${condicion}"`)
      return true
  }
}
