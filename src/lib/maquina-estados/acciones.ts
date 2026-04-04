"use server"

import { createClient } from "@/lib/supabase/server"
import { anularAsiento } from "@/lib/contable/asientos"
import type { DatosTransicion } from "./tipos"

/**
 * Ejecuta una acción post-transición individual.
 * Cada acción puede interactuar con la DB, llamar a RPCs o disparar side-effects.
 */
export async function ejecutarAccion(
  pedidoId: string,
  accion: string,
  datos?: DatosTransicion,
): Promise<void> {
  const supabase = await createClient()

  switch (accion) {
    // ── Tareas ──────────────────────────────────────────────────────
    case "crear_tareas_automaticas": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("tipo")
        .eq("id", pedidoId)
        .single()

      if (pedido) {
        const { crearChecklistPedido } = await import("@/lib/checklist/crear-checklist")
        await crearChecklistPedido(pedidoId, pedido.tipo)
      }
      break
    }

    case "crear_tareas_armado": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("tipo")
        .eq("id", pedidoId)
        .single()

      if (pedido) {
        const { crearChecklistPedido } = await import("@/lib/checklist/crear-checklist")
        await crearChecklistPedido(pedidoId, pedido.tipo)
      }
      break
    }

    // ── Evaluaciones automáticas ────────────────────────────────────
    case "evaluar_pago": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("monto_total, monto_pagado, tipo_despacho, datos_envio")
        .eq("id", pedidoId)
        .single()

      if (!pedido) break

      const pagoCompleto = pedido.monto_pagado >= pedido.monto_total - 0.01
      const datosEnvioOk =
        pedido.tipo_despacho &&
        (pedido.tipo_despacho === "retiro_oficina" || pedido.datos_envio !== null)

      // Import dinámico para evitar dependencia circular
      const { ejecutarTransicion } = await import("./ejecutar-transicion")

      if (pagoCompleto && datosEnvioOk) {
        await ejecutarTransicion(pedidoId, "listo_para_despachar")
      } else if (!pagoCompleto) {
        await ejecutarTransicion(pedidoId, "pendiente_de_cobro")
      }
      // Si pago completo pero sin datos de envío, queda en armado_completo
      break
    }

    case "evaluar_cierre": {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("monto_total, monto_pagado")
        .eq("id", pedidoId)
        .single()

      if (!pedido) break

      const pagoCompleto = pedido.monto_pagado >= pedido.monto_total - 0.01

      const { count: tareasPendientes } = await supabase
        .from("tareas")
        .select("id", { count: "exact", head: true })
        .eq("pedido_id", pedidoId)
        .neq("estado", "terminada")

      if (pagoCompleto && (tareasPendientes ?? 0) === 0) {
        const { ejecutarTransicion } = await import("./ejecutar-transicion")
        await ejecutarTransicion(pedidoId, "cerrado")
      }
      break
    }

    // ── Contabilidad ────────────────────────────────────────────────
    case "revertir_asientos_contables": {
      const { data: asientos } = await supabase
        .from("asientos")
        .select("id")
        .eq("referencia_tipo", "pedido")
        .eq("referencia_id", pedidoId)
        .eq("anulado", false)

      if (asientos) {
        for (const asiento of asientos) {
          await anularAsiento(asiento.id)
        }
      }
      break
    }

    // ── Tienda Nube (placeholders) ──────────────────────────────────
    case "marcar_empaquetado_tiendanube": {
      console.log(
        `[maquina-estados] TODO: marcar empaquetado en Tienda Nube para pedido ${pedidoId}`,
      )
      break
    }

    case "sincronizar_tiendanube_despachado": {
      console.log(
        `[maquina-estados] TODO: sincronizar despacho en Tienda Nube para pedido ${pedidoId}`,
        datos?.codigo_seguimiento ? `tracking: ${datos.codigo_seguimiento}` : "",
      )
      break
    }

    case "sincronizar_tiendanube_entregado": {
      console.log(
        `[maquina-estados] TODO: sincronizar entrega en Tienda Nube para pedido ${pedidoId}`,
      )
      break
    }

    // ── Notificaciones (placeholders) ───────────────────────────────
    case "notificar_cliente_pendiente_pago": {
      console.log(
        `[maquina-estados] TODO: notificar cliente pago pendiente — pedido ${pedidoId}`,
      )
      break
    }

    case "notificar_cliente_confirmado": {
      console.log(
        `[maquina-estados] TODO: notificar cliente pedido confirmado — pedido ${pedidoId}`,
      )
      break
    }

    case "notificar_cliente_listo": {
      console.log(
        `[maquina-estados] TODO: notificar cliente pedido listo — pedido ${pedidoId}`,
      )
      break
    }

    case "notificar_cliente_despachado": {
      console.log(
        `[maquina-estados] TODO: notificar cliente pedido despachado — pedido ${pedidoId}`,
      )
      break
    }

    case "notificar_cliente_entregado": {
      console.log(
        `[maquina-estados] TODO: notificar cliente pedido entregado — pedido ${pedidoId}`,
      )
      break
    }

    case "notificar_cliente_cancelacion": {
      console.log(
        `[maquina-estados] TODO: notificar cliente cancelación — pedido ${pedidoId}`,
      )
      break
    }

    // ── Portal cliente ──────────────────────────────────────────────
    case "actualizar_portal_cliente": {
      // No-op: el portal lee el estado actual directamente
      break
    }

    // ── Bloqueo / desbloqueo ────────────────────────────────────────
    case "registrar_bloqueo": {
      // No-op: el subestado ya se guarda en ejecutar-transicion
      break
    }

    case "registrar_desbloqueo": {
      // No-op: se limpia subestado en ejecutar-transicion
      break
    }

    // ── Cancelación ─────────────────────────────────────────────────
    case "registrar_cancelacion": {
      await supabase
        .from("pedidos")
        .update({
          motivo_cancelacion: datos?.motivo ?? null,
          fecha_cancelacion: new Date().toISOString(),
        })
        .eq("id", pedidoId)
      break
    }

    // ── Archivo ─────────────────────────────────────────────────────
    case "archivar_pedido": {
      await supabase
        .from("pedidos")
        .update({
          fecha_cierre: new Date().toISOString(),
        })
        .eq("id", pedidoId)
      break
    }

    default:
      console.warn(`[maquina-estados] Acción desconocida: "${accion}"`)
  }
}
