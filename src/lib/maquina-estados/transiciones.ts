import type { EstadoPedido, Transicion } from "./tipos"

/**
 * Mapa completo de transiciones válidas del pedido.
 * Clave: estado actual. Valor: array de destinos posibles con condiciones y acciones.
 */
export const transicionesValidas: Record<string, Transicion[]> = {
  nuevo: [
    {
      estado: "pendiente_de_sena",
      condiciones: ["confirmacion_usuario"],
      acciones: ["notificar_cliente_pendiente_pago"],
    },
    {
      estado: "habilitado",
      condiciones: ["pago_anticipo_registrado"],
      acciones: ["crear_tareas_automaticas"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "notificar_cliente_cancelacion"],
    },
  ],

  pendiente_de_sena: [
    {
      estado: "habilitado",
      condiciones: ["pago_anticipo_registrado"],
      acciones: ["crear_tareas_automaticas", "notificar_cliente_confirmado"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "notificar_cliente_cancelacion"],
    },
  ],

  habilitado: [
    {
      estado: "en_prearmado",
      condiciones: [],
      acciones: [],
    },
    {
      estado: "bloqueado",
      condiciones: ["motivo_bloqueo"],
      acciones: ["registrar_bloqueo"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  en_prearmado: [
    {
      estado: "listo_para_armar",
      condiciones: ["todas_tareas_prearmado_completadas"],
      acciones: [],
    },
    {
      estado: "bloqueado",
      condiciones: ["motivo_bloqueo"],
      acciones: ["registrar_bloqueo"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  bloqueado: [
    {
      // Destino dinámico: vuelve a estado_anterior
      estado: "__estado_anterior__",
      condiciones: ["motivo_desbloqueo_resuelto"],
      acciones: ["registrar_desbloqueo"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  listo_para_armar: [
    {
      estado: "en_armado",
      condiciones: [],
      acciones: ["crear_tareas_armado"],
    },
    {
      estado: "bloqueado",
      condiciones: ["motivo_bloqueo"],
      acciones: ["registrar_bloqueo"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  en_armado: [
    {
      estado: "armado_completo",
      condiciones: ["todas_tareas_armado_completadas"],
      acciones: ["evaluar_pago"],
    },
    {
      estado: "bloqueado",
      condiciones: ["motivo_bloqueo"],
      acciones: ["registrar_bloqueo"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  armado_completo: [
    {
      estado: "pendiente_de_cobro",
      condiciones: ["pago_incompleto"],
      acciones: ["notificar_cliente_pendiente_pago"],
    },
    {
      estado: "listo_para_despachar",
      condiciones: ["pago_completo", "datos_envio_completos"],
      acciones: ["marcar_empaquetado_tiendanube"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  pendiente_de_cobro: [
    {
      estado: "listo_para_despachar",
      condiciones: ["pago_completo", "datos_envio_completos"],
      acciones: ["marcar_empaquetado_tiendanube", "notificar_cliente_listo"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  listo_para_despachar: [
    {
      estado: "despachado",
      condiciones: ["datos_envio_completos"],
      acciones: ["sincronizar_tiendanube_despachado", "notificar_cliente_despachado"],
    },
    {
      estado: "cancelado",
      condiciones: ["motivo_cancelacion"],
      acciones: ["registrar_cancelacion", "revertir_asientos_contables", "notificar_cliente_cancelacion"],
    },
  ],

  despachado: [
    {
      estado: "entregado",
      condiciones: ["confirmacion_usuario"],
      acciones: ["sincronizar_tiendanube_entregado", "notificar_cliente_entregado", "evaluar_cierre"],
    },
  ],

  entregado: [
    {
      estado: "cerrado",
      condiciones: ["pago_total_recibido", "sin_tareas_pendientes"],
      acciones: ["archivar_pedido", "actualizar_portal_cliente"],
    },
  ],

  cancelado: [],

  cerrado: [],
}

// ---------------------------------------------------------------------------
// Labels y estilos para badges de UI
// ---------------------------------------------------------------------------

export const estadoLabels: Record<EstadoPedido, string> = {
  nuevo: "Nuevo",
  pendiente_de_sena: "Pendiente de seña",
  habilitado: "Habilitado",
  en_prearmado: "En pre-armado",
  bloqueado: "Bloqueado",
  listo_para_armar: "Listo para armar",
  en_armado: "En armado",
  armado_completo: "Armado completo",
  pendiente_de_cobro: "Pendiente de cobro",
  listo_para_despachar: "Listo para despachar",
  despachado: "Despachado",
  entregado: "Entregado",
  cancelado: "Cancelado",
  cerrado: "Cerrado",
}

export const estadoStyles: Record<EstadoPedido, { bg: string; text: string }> = {
  nuevo: { bg: "bg-blue-100", text: "text-blue-800" },
  pendiente_de_sena: { bg: "bg-amber-100", text: "text-amber-800" },
  habilitado: { bg: "bg-green-100", text: "text-green-800" },
  en_prearmado: { bg: "bg-blue-100", text: "text-blue-700" },
  bloqueado: { bg: "bg-red-100", text: "text-red-800" },
  listo_para_armar: { bg: "bg-green-100", text: "text-green-800" },
  en_armado: { bg: "bg-green-200", text: "text-green-900" },
  armado_completo: { bg: "bg-emerald-100", text: "text-emerald-800" },
  pendiente_de_cobro: { bg: "bg-orange-100", text: "text-orange-800" },
  listo_para_despachar: { bg: "bg-violet-100", text: "text-violet-800" },
  despachado: { bg: "bg-gray-100", text: "text-gray-700" },
  entregado: { bg: "bg-teal-100", text: "text-teal-800" },
  cancelado: { bg: "bg-red-200", text: "text-red-900" },
  cerrado: { bg: "bg-gray-200", text: "text-gray-800" },
}
