import type { EstadoInterno } from "@/types/database"

interface EntradaHistorial {
  id: string
  accion: string
  estado_anterior: string | null
  estado_nuevo: string | null
  created_at: string
}

interface EntradaPago {
  id: string
  monto: number
  concepto: string
  fecha: string
}

export interface EventoCliente {
  fecha: string
  texto: string
  esActual: boolean
}

/** Internal states that are meaningful to the customer */
const ESTADOS_VISIBLES: Set<string> = new Set<string>([
  "nuevo",
  "habilitado",
  "sena_recibida",
  "en_prearmado",
  "en_armado",
  "listo_para_despachar",
  "listo_para_despacho",
  "despachado",
  "entregado",
  "cerrado",
  "cancelado",
])

/** Map internal state names to client-friendly labels */
const LABEL_ESTADO: Record<string, string> = {
  nuevo: "Pedido recibido",
  habilitado: "Pedido confirmado",
  sena_recibida: "Pedido confirmado",
  en_prearmado: "Ingresó a producción",
  en_armado: "En preparación",
  listo_para_despachar: "Listo para despacho",
  listo_para_despacho: "Listo para despacho",
  despachado: "Pedido despachado",
  entregado: "Pedido entregado",
  cerrado: "Pedido entregado",
  cancelado: "Pedido cancelado",
}

/** Map payment concepts to client-friendly labels */
const LABEL_CONCEPTO: Record<string, string> = {
  sena: "Seña recibida",
  saldo: "Pago de saldo recibido",
  pago_total: "Pago recibido",
}

/**
 * Filters the full order history + payments to only show
 * events that are meaningful for the customer.
 */
export function filtrarHistorialCliente(
  historial: EntradaHistorial[],
  pagos: EntradaPago[]
): EventoCliente[] {
  const eventos: EventoCliente[] = []

  // Estado changes visible to the client
  for (const entrada of historial) {
    if (
      entrada.accion === "cambio_estado" &&
      entrada.estado_nuevo &&
      ESTADOS_VISIBLES.has(entrada.estado_nuevo)
    ) {
      const label =
        LABEL_ESTADO[entrada.estado_nuevo] ?? entrada.estado_nuevo
      eventos.push({
        fecha: entrada.created_at,
        texto: label,
        esActual: false,
      })
    }
  }

  // Payment events
  for (const pago of pagos) {
    const label =
      LABEL_CONCEPTO[pago.concepto] ?? "Pago recibido"
    const montoFormateado = pago.monto.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    eventos.push({
      fecha: pago.fecha,
      texto: `${label} — $${montoFormateado}`,
      esActual: false,
    })
  }

  // Sort descending by date
  eventos.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  // Mark the most recent event as current
  if (eventos.length > 0) {
    eventos[0].esActual = true
  }

  return eventos
}
