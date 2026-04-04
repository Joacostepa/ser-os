export function formatearMonto(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 10_000) return `$${(valor / 1_000).toFixed(0)}K`
  return `$${valor.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
}

export function formatearMontoCompleto(valor: number): string {
  return `$${valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function calcularVariacion(
  valorActual: number,
  valorAnterior: number
): { porcentaje: number; trend: "up" | "down" | "neutral"; texto: string } {
  if (valorAnterior === 0) return { porcentaje: 0, trend: "neutral", texto: "Sin datos previos" }
  const porcentaje = ((valorActual - valorAnterior) / valorAnterior) * 100
  const trend = porcentaje > 0 ? "up" : porcentaje < 0 ? "down" : "neutral"
  const signo = porcentaje > 0 ? "↑" : "↓"
  return {
    porcentaje: Math.abs(Math.round(porcentaje * 10) / 10),
    trend,
    texto: `${signo} ${Math.abs(Math.round(porcentaje))}% vs período anterior`,
  }
}

export function formatearTiempoRelativo(fecha: string | Date): string {
  const now = new Date()
  const d = new Date(fecha)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "ahora"
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffHrs < 24) return `hace ${diffHrs}h`
  if (diffDays < 7) return `hace ${diffDays}d`
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}
