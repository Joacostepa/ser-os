"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { DatosTransicion, EstadoPedido } from "./tipos"
import { transicionesValidas } from "./transiciones"
import { validarTransicion } from "./validar-transicion"
import { ejecutarAccion } from "./acciones"

// ---------------------------------------------------------------------------
// Mapeo de estados viejos (DB enum legacy) → estados nuevos
// ---------------------------------------------------------------------------
const ESTADO_LEGACY_MAP: Record<string, EstadoPedido> = {
  pendiente_sena: "pendiente_de_sena",
  sena_recibida: "habilitado",
  esperando_insumos: "bloqueado",
  esperando_diseno: "bloqueado",
  insumos_recibidos: "listo_para_armar",
  listo_para_despacho: "listo_para_despachar",
  en_preparacion_envio: "listo_para_despachar",
  pendiente_saldo: "pendiente_de_cobro",
}

/**
 * Normaliza un valor de estado_interno de la DB al esquema nuevo de 14 estados.
 * Si el valor ya es uno de los 14, lo devuelve tal cual.
 */
function normalizarEstado(estadoDB: string): EstadoPedido {
  if (estadoDB in transicionesValidas) {
    return estadoDB as EstadoPedido
  }
  const mapped = ESTADO_LEGACY_MAP[estadoDB]
  if (mapped) return mapped
  // Fallback: devolver como está y dejar que la validación lo rechace
  return estadoDB as EstadoPedido
}

/**
 * Ejecuta una transición completa de estado para un pedido.
 *
 * 1. Obtiene el estado actual del pedido
 * 2. Idempotencia: si ya está en el destino, retorna silenciosamente
 * 3. Valida la transición (condiciones)
 * 4. Actualiza el pedido en la DB
 * 5. Registra en historial
 * 6. Ejecuta las acciones post-transición
 * 7. Revalida paths de Next.js
 */
export async function ejecutarTransicion(
  pedidoId: string,
  estadoDestino: string,
  datos?: DatosTransicion,
): Promise<void> {
  const supabase = await createClient()

  // 1. Obtener estado actual
  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("estado_interno, estado_anterior, subestado")
    .eq("id", pedidoId)
    .single()

  if (fetchError || !pedido) {
    throw new Error(`Pedido ${pedidoId} no encontrado`)
  }

  const estadoActual = normalizarEstado(pedido.estado_interno)

  // 2. Idempotencia
  if (estadoDestino === estadoActual) {
    return
  }

  // 3. Validar transición
  const resultado = await validarTransicion(pedidoId, estadoActual, estadoDestino)

  if (!resultado.valido) {
    throw new Error(resultado.error ?? "Transición no válida")
  }

  // 4. Preparar datos de actualización
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    estado_interno: estadoDestino,
  }

  // Si se transiciona HACIA bloqueado, guardar el estado actual como anterior
  if (estadoDestino === "bloqueado") {
    updateData.estado_anterior = estadoActual
    updateData.subestado = datos?.subestado ?? "otro"
  }
  // Si se transiciona DESDE bloqueado, limpiar estado_anterior y subestado
  else if (estadoActual === "bloqueado") {
    updateData.estado_anterior = null
    updateData.subestado = null
  }
  // Para cualquier otra transición, limpiar subestado si existía
  else {
    updateData.subestado = null
  }

  // 5. Actualizar pedido en la DB
  const { error: updateError } = await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", pedidoId)

  if (updateError) {
    throw new Error(`Error al actualizar pedido: ${updateError.message}`)
  }

  // 6. Registrar en historial
  await supabase.from("historial_pedido").insert({
    pedido_id: pedidoId,
    accion: `Transición de estado: ${estadoActual} → ${estadoDestino}`,
    estado_anterior: estadoActual,
    estado_nuevo: estadoDestino,
    datos: datos ? (datos as Record<string, unknown>) : null,
  })

  // 7. Ejecutar acciones post-transición
  // Buscar la transición exacta para obtener las acciones
  let transicion = transicionesValidas[estadoActual]?.find(
    (t) => t.estado === estadoDestino,
  )

  // Si es una transición de desbloqueo (bloqueado → estado_anterior), usar la genérica
  if (!transicion && estadoActual === "bloqueado") {
    transicion = transicionesValidas.bloqueado?.find(
      (t) => t.estado === "__estado_anterior__",
    )
  }

  if (transicion?.acciones) {
    for (const accion of transicion.acciones) {
      await ejecutarAccion(pedidoId, accion, datos)
    }
  }

  // 8. Revalidar paths
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${pedidoId}`)
}
