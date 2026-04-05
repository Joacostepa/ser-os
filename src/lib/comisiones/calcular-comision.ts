import type { SupabaseClient } from "@supabase/supabase-js"

export interface ComisionCalculada {
  metodo_pago: string
  monto_bruto: number
  tasa_pasarela: number
  comision_pasarela_neta: number
  iva_comision_pasarela: number
  comision_pasarela_total: number
  tasa_tn: number
  comision_tn: number
  total_comisiones: number
  monto_neto_recibido: number
}

function cero(metodoPago: string, montoPago: number): ComisionCalculada {
  return {
    metodo_pago: metodoPago,
    monto_bruto: montoPago,
    tasa_pasarela: 0,
    comision_pasarela_neta: 0,
    iva_comision_pasarela: 0,
    comision_pasarela_total: 0,
    tasa_tn: 0,
    comision_tn: 0,
    total_comisiones: 0,
    monto_neto_recibido: montoPago,
  }
}

function r2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Calcula la comisión de pasarela para un pago.
 * Recibe el supabase client como parámetro para funcionar tanto
 * desde server actions (user client) como desde webhooks (admin client).
 */
export async function calcularComision(
  supabase: SupabaseClient,
  montoPago: number,
  metodoPago: string,
  canalPedido: string | null,
): Promise<ComisionCalculada> {
  // Pedidos que no pasan por TN no tienen comisiones
  if (canalPedido !== "tienda_nube") {
    return cero(metodoPago, montoPago)
  }

  // Obtener config del método de pago
  const { data: config } = await supabase
    .from("comisiones_config")
    .select("*")
    .eq("metodo_pago", metodoPago)
    .eq("activo", true)
    .single()

  if (!config) {
    return cero(metodoPago, montoPago)
  }

  // Calcular comisión de pasarela
  const tasaPasarela = Number(config.tasa_porcentaje) / 100
  let comisionPasarelaNeta: number
  let ivaComision: number

  if (config.incluye_iva) {
    // La tasa ya incluye IVA — extraer el neto
    const tasaIva = Number(config.tasa_iva) || 0.21
    const comisionBruta = montoPago * tasaPasarela
    comisionPasarelaNeta = comisionBruta / (1 + tasaIva)
    ivaComision = comisionBruta - comisionPasarelaNeta
  } else {
    // La tasa es neta — sumar IVA aparte
    comisionPasarelaNeta = montoPago * tasaPasarela
    const tasaIva = Number(config.tasa_iva) || 0.21
    ivaComision = comisionPasarelaNeta * tasaIva
  }

  const comisionPasarelaTotal = comisionPasarelaNeta + ivaComision

  // Comisión fija (si aplica, sin IVA)
  comisionPasarelaNeta += Number(config.comision_fija) || 0

  // Comisión de TN por transacción (si aplica)
  let tasaTn = 0
  let comisionTn = 0

  if (config.comision_tn_adicional) {
    const { data: configTn } = await supabase
      .from("comisiones_config")
      .select("tasa_porcentaje")
      .eq("metodo_pago", "tienda_nube_transaccion")
      .eq("activo", true)
      .single()

    if (configTn) {
      tasaTn = Number(configTn.tasa_porcentaje)
      comisionTn = montoPago * (tasaTn / 100)
    }
  }

  // Totales
  const totalComisiones = comisionPasarelaTotal + comisionTn
  const montoNetoRecibido = montoPago - totalComisiones

  return {
    metodo_pago: metodoPago,
    monto_bruto: montoPago,
    tasa_pasarela: Number(config.tasa_porcentaje),
    comision_pasarela_neta: r2(comisionPasarelaNeta),
    iva_comision_pasarela: r2(ivaComision),
    comision_pasarela_total: r2(comisionPasarelaTotal),
    tasa_tn: tasaTn,
    comision_tn: r2(comisionTn),
    total_comisiones: r2(totalComisiones),
    monto_neto_recibido: r2(montoNetoRecibido),
  }
}
