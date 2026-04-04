/**
 * Mensajes de error legibles para cada condición que puede fallar.
 */
const mensajesCondicion: Record<string, string> = {
  pago_total_recibido: "El pago total no fue recibido",
  pago_anticipo_registrado: "No se registró ningún anticipo o seña",
  pago_completo: "El pago no está completo",
  pago_incompleto: "El pago ya está completo (no aplica esta transición)",
  todas_tareas_prearmado_completadas:
    "Hay tareas de pre-armado (diseño / operaciones) sin completar",
  todas_tareas_armado_completadas: "Hay tareas de armado sin completar",
  datos_envio_completos:
    "Faltan los datos de envío o no se definió el tipo de despacho",
  sin_tareas_pendientes: "Hay tareas pendientes sin completar",
  confirmacion_usuario: "Se requiere confirmación del usuario",
  motivo_cancelacion: "Se requiere un motivo de cancelación",
  motivo_bloqueo: "Se requiere un motivo de bloqueo",
  motivo_desbloqueo_resuelto: "Se debe indicar que el motivo de bloqueo fue resuelto",
}

/**
 * Traduce un array de nombres de condiciones a un string legible
 * separado por " | ".
 */
export function traducirCondiciones(condiciones: string[]): string {
  return condiciones
    .map((c) => mensajesCondicion[c] ?? `Condición no cumplida: ${c}`)
    .join(" | ")
}

export { mensajesCondicion }
