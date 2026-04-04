export type CasaDolar = "oficial" | "blue" | "bolsa" | "contadoconliqui" | "cripto" | "mayorista" | "tarjeta"

export interface Cotizacion {
  moneda: string
  casa: CasaDolar
  nombre: string
  compra: number
  venta: number
  fechaActualizacion: string
}

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares"

let cache: { data: Cotizacion[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getCotizaciones(): Promise<Cotizacion[]> {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }

  try {
    const res = await fetch(DOLAR_API_URL, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`DolarAPI error: ${res.status}`)

    const data: Cotizacion[] = await res.json()
    cache = { data, timestamp: Date.now() }
    return data
  } catch {
    // Return cached data if available, even if stale
    if (cache) return cache.data
    return []
  }
}

export async function getCotizacion(casa: CasaDolar = "blue"): Promise<Cotizacion | null> {
  const cotizaciones = await getCotizaciones()
  return cotizaciones.find((c) => c.casa === casa) || null
}

export async function getCotizacionVenta(casa: CasaDolar = "blue"): Promise<number | null> {
  const cotizacion = await getCotizacion(casa)
  return cotizacion?.venta || null
}
