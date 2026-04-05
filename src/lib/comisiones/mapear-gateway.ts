/**
 * Mapea gateways de Tienda Nube a métodos internos de comisiones_config
 */
export function mapearGatewayTN(gateway: string, paymentMethod?: string): string {
  if (gateway === "nuvem_pago" || gateway === "Nuvem Pago") {
    return paymentMethod === "bank_transfer"
      ? "pago_nube_transferencia"
      : "pago_nube_tarjeta"
  }

  const mapa: Record<string, string> = {
    mercadopago: "mercadopago",
    "Mercado Pago": "mercadopago",
    gocuotas: "gocuotas",
    "Go Cuotas": "gocuotas",
    wire_transfer: "transferencia_directa",
    bank_deposit: "transferencia_directa",
    cash: "efectivo",
    custom: "transferencia_directa",
    "not-provided": "transferencia_directa",
  }

  return mapa[gateway] || "transferencia_directa"
}

/**
 * Mapea el metodo_pago del modal de pago manual al key de comisiones_config,
 * según si el pedido es de TN o manual.
 */
export function mapearMetodoManual(metodo: string, canal: string | null): string {
  if (canal !== "tienda_nube") {
    // Pedido manual — no pasa por TN, comisión 0 siempre
    if (metodo === "efectivo") return "manual_efectivo"
    return "manual_transferencia"
  }

  // Pedido TN pagado manualmente desde la app
  const mapa: Record<string, string> = {
    transferencia: "transferencia_directa",
    mercadopago: "mercadopago",
    efectivo: "efectivo",
    cheque: "transferencia_directa",
    otro: "transferencia_directa",
  }

  return mapa[metodo] || "transferencia_directa"
}
