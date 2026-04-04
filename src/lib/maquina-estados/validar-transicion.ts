"use server"

import type { ResultadoTransicion } from "./tipos"
import { transicionesValidas } from "./transiciones"
import { evaluarCondicion } from "./condiciones"
import { traducirCondiciones } from "./mensajes-error"
import { createClient } from "@/lib/supabase/server"

/**
 * Valida si un pedido puede transicionar del estadoActual al estadoDestino.
 * Evalúa todas las condiciones definidas en el mapa de transiciones.
 *
 * Para el estado "bloqueado", el destino especial "__estado_anterior__" se
 * resuelve al estado_anterior guardado en el pedido.
 */
export async function validarTransicion(
  pedidoId: string,
  estadoActual: string,
  estadoDestino: string,
): Promise<ResultadoTransicion> {
  const transiciones = transicionesValidas[estadoActual]

  if (!transiciones) {
    return {
      valido: false,
      error: `El estado "${estadoActual}" no tiene transiciones definidas`,
    }
  }

  // Para bloqueado → destino dinámico: buscar la transición con "__estado_anterior__"
  let transicion = transiciones.find((t) => t.estado === estadoDestino)

  if (!transicion && estadoActual === "bloqueado") {
    // Si el destino no es "cancelado", intentar con la transición genérica de desbloqueo
    const desbloqueoPossible = transiciones.find(
      (t) => t.estado === "__estado_anterior__",
    )
    if (desbloqueoPossible) {
      // Verificar que el destino coincide con estado_anterior del pedido
      const supabase = await createClient()
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("estado_anterior")
        .eq("id", pedidoId)
        .single()

      if (pedido?.estado_anterior === estadoDestino) {
        transicion = desbloqueoPossible
      }
    }
  }

  if (!transicion) {
    return {
      valido: false,
      error: `No se puede pasar de "${estadoActual}" a "${estadoDestino}"`,
    }
  }

  // Evaluar todas las condiciones
  const condicionesFallidas: string[] = []

  for (const condicion of transicion.condiciones) {
    const cumplida = await evaluarCondicion(pedidoId, condicion)
    if (!cumplida) {
      condicionesFallidas.push(condicion)
    }
  }

  if (condicionesFallidas.length > 0) {
    return {
      valido: false,
      error: traducirCondiciones(condicionesFallidas),
      condicionesFaltantes: condicionesFallidas,
    }
  }

  return { valido: true }
}
