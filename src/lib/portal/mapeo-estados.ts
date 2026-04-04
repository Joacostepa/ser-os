import type { EstadoInterno, TipoDespacho } from "@/types/database"

export interface EstadoCliente {
  paso: number
  label: string
  mensaje: string
  mostrarPagoPendiente: boolean
}

/**
 * Maps internal order state (14+ variants) to a simplified 7-step client view.
 *
 * Steps:
 * 1 — Pedido recibido
 * 2 — Pedido confirmado
 * 3 — En produccion
 * 4 — En preparacion
 * 5 — Listo para envio / retiro
 * 6 — En camino
 * 7 — Entregado
 */
export function mapearEstadoCliente(
  estadoInterno: EstadoInterno,
  subestado: string | null | undefined,
  saldoPendiente: number,
  tipoDespacho: TipoDespacho | null | undefined
): EstadoCliente {
  switch (estadoInterno) {
    // ── Paso 1 ──────────────────────────────────────────────
    case "nuevo":
      return {
        paso: 1,
        label: "Pedido recibido",
        mensaje:
          "Tu pedido fue recibido y está siendo procesado por nuestro equipo.",
        mostrarPagoPendiente: false,
      }

    case "pendiente_sena":
    case "pendiente_de_sena":
      return {
        paso: 1,
        label: "Pendiente de pago",
        mensaje:
          "Tu pedido fue recibido. Para confirmarlo necesitamos que realices el pago de la seña.",
        mostrarPagoPendiente: true,
      }

    // ── Paso 2 ──────────────────────────────────────────────
    case "habilitado":
    case "sena_recibida":
      return {
        paso: 2,
        label: "Pedido confirmado",
        mensaje:
          "Tu pedido fue confirmado y ya ingresó a nuestra cola de producción.",
        mostrarPagoPendiente: false,
      }

    // ── Paso 3 ──────────────────────────────────────────────
    case "en_prearmado":
    case "listo_para_armar":
    case "esperando_insumos":
    case "esperando_diseno":
    case "insumos_recibidos":
      return {
        paso: 3,
        label: "En producción",
        mensaje:
          "Tu pedido está en producción. Estamos preparando todo para vos.",
        mostrarPagoPendiente: false,
      }

    case "bloqueado":
      if (subestado === "pago") {
        return {
          paso: 3,
          label: "En producción — pendiente de pago",
          mensaje:
            "Tu pedido está en producción pero necesitamos que regularices un pago para continuar.",
          mostrarPagoPendiente: true,
        }
      }
      return {
        paso: 3,
        label: "En producción",
        mensaje:
          "Tu pedido está en producción. Estamos preparando todo para vos.",
        mostrarPagoPendiente: false,
      }

    // ── Paso 4 ──────────────────────────────────────────────
    case "en_armado":
    case "armado_completo":
    case "en_preparacion_envio":
      return {
        paso: 4,
        label: "En preparación",
        mensaje:
          "Tu pedido está siendo preparado para el despacho.",
        mostrarPagoPendiente: false,
      }

    case "pendiente_de_cobro":
    case "pendiente_saldo":
      return {
        paso: 4,
        label: "Pendiente de pago del saldo",
        mensaje:
          saldoPendiente > 0
            ? `Tu pedido está casi listo. Queda un saldo pendiente de $${saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para coordinar el envío.`
            : "Tu pedido está casi listo. Contactanos para coordinar el pago del saldo.",
        mostrarPagoPendiente: true,
      }

    // ── Paso 5 ──────────────────────────────────────────────
    case "listo_para_despachar":
    case "listo_para_despacho":
      return {
        paso: 5,
        label:
          tipoDespacho === "retiro_oficina"
            ? "Listo para retirar"
            : "Listo para envío",
        mensaje:
          tipoDespacho === "retiro_oficina"
            ? "¡Tu pedido está listo! Coordiná el retiro por nuestros canales de contacto."
            : "¡Tu pedido está listo! Te avisamos apenas lo despachemos.",
        mostrarPagoPendiente: false,
      }

    // ── Paso 6 ──────────────────────────────────────────────
    case "despachado":
      return {
        paso: 6,
        label: "En camino",
        mensaje: "Tu pedido fue despachado y está en camino.",
        mostrarPagoPendiente: false,
      }

    // ── Paso 7 ──────────────────────────────────────────────
    case "entregado":
    case "cerrado":
      return {
        paso: 7,
        label: "Entregado",
        mensaje: "¡Tu pedido fue entregado! Gracias por tu compra.",
        mostrarPagoPendiente: false,
      }

    // ── Cancelado ───────────────────────────────────────────
    case "cancelado":
      return {
        paso: 1,
        label: "Pedido cancelado",
        mensaje:
          "Este pedido fue cancelado. Si tenés dudas, contactanos.",
        mostrarPagoPendiente: false,
      }

    default:
      return {
        paso: 1,
        label: "En proceso",
        mensaje: "Tu pedido está siendo procesado.",
        mostrarPagoPendiente: false,
      }
  }
}
