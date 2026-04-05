"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Returns the pending balance for a pedido (monto_total - sum of pagos).
 */
export async function getSaldoPendiente(pedidoId: string): Promise<number> {
  const supabase = await createClient()

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("monto_total")
    .eq("id", pedidoId)
    .single()

  if (pedidoError || !pedido) throw new Error("Pedido no encontrado")

  const totalPagado = await getTotalPagado(pedidoId)
  return Number(pedido.monto_total) - totalPagado
}

/**
 * Returns the total amount already paid for a pedido.
 */
export async function getTotalPagado(pedidoId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pagos")
    .select("monto")
    .eq("pedido_id", pedidoId)

  if (error) throw new Error("Error al obtener pagos: " + error.message)

  return (data || []).reduce((sum, p) => sum + Number(p.monto), 0)
}

/**
 * Generates a receipt number via Supabase RPC.
 */
export async function generarNumeroRecibo(): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("generar_numero_recibo")

  if (error) throw new Error("Error al generar numero de recibo: " + error.message)
  return data as string
}

/**
 * Maps Tienda Nube gateway names to readable labels.
 */
export async function mapearGatewayTN(gateway: string): Promise<string> {
  const map: Record<string, string> = {
    mercadopago: "MercadoPago",
    "Mercado Pago": "MercadoPago",
    wire_transfer: "Transferencia bancaria",
    "Transferencia bancaria": "Transferencia bancaria",
    cash: "Efectivo",
    custom: "Otro",
    todopago: "TodoPago",
    paypal: "PayPal",
    credit_card: "Tarjeta de crédito",
    debit_card: "Tarjeta de débito",
  }
  return map[gateway] || gateway
}

/**
 * Returns a descriptive concept text for a payment type.
 * Not exported — used only by registrar-pago.ts via direct import.
 */
function conceptoPorTipoFn(
  tipo: "anticipo" | "parcial" | "saldo" | "total",
  numeroPedido: string | null,
): string {
  const ref = numeroPedido ? ` #${numeroPedido}` : ""
  switch (tipo) {
    case "anticipo":
      return `Anticipo/seña pedido${ref}`
    case "parcial":
      return `Pago parcial pedido${ref}`
    case "saldo":
      return `Saldo final pedido${ref}`
    case "total":
      return `Pago total pedido${ref}`
    default:
      return `Pago pedido${ref}`
  }
}

// Wrap as async for "use server" export compatibility
export async function conceptoPorTipo(
  tipo: "anticipo" | "parcial" | "saldo" | "total",
  numeroPedido: string | null,
): Promise<string> {
  return conceptoPorTipoFn(tipo, numeroPedido)
}
