/**
 * IVA (VAT) helpers for Argentina
 * SER is Responsable Inscripto. TiendaNube prices include IVA.
 * Costs are loaded without IVA.
 */

export const IVA_TASA_DEFAULT = 0.21 // 21%

/**
 * Extract neto (base price without IVA) from a price that includes IVA
 */
export function calcularNeto(precioConIva: number, tasaIva: number = IVA_TASA_DEFAULT): number {
  return Math.round((precioConIva / (1 + tasaIva)) * 100) / 100
}

/**
 * Calculate IVA amount from a price that includes IVA
 */
export function calcularIVA(precioConIva: number, tasaIva: number = IVA_TASA_DEFAULT): number {
  const neto = calcularNeto(precioConIva, tasaIva)
  return Math.round((precioConIva - neto) * 100) / 100
}

/**
 * Calculate price with IVA from a neto price
 */
export function calcularConIVA(precioNeto: number, tasaIva: number = IVA_TASA_DEFAULT): number {
  return Math.round(precioNeto * (1 + tasaIva) * 100) / 100
}

/**
 * Split a total amount into neto + IVA
 */
export function descomponerIVA(totalConIva: number, tasaIva: number = IVA_TASA_DEFAULT): {
  neto: number
  iva: number
  total: number
} {
  const neto = calcularNeto(totalConIva, tasaIva)
  const iva = calcularIVA(totalConIva, tasaIva)
  return { neto, iva, total: totalConIva }
}
