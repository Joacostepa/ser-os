"use server"

import { createClient } from "@/lib/supabase/server"
import { getClubConfig } from "./config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularRacha(pedidos: any[]): number {
  if (pedidos.length === 0) return 0
  let racha = 0
  const hoy = new Date()
  let mes = hoy.getMonth()
  let anio = hoy.getFullYear()

  for (let i = 0; i < 24; i++) {
    const hay = pedidos.some((p: { created_at: string }) => {
      const f = new Date(p.created_at)
      return f.getMonth() === mes && f.getFullYear() === anio
    })
    if (hay) racha++
    else break
    mes--
    if (mes < 0) { mes = 11; anio-- }
  }
  return racha
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDescuento(estado: string, nivel: string, config: Record<string, any>): number {
  const mapa: Record<string, Record<string, string>> = {
    activa: { estandar: "descuento_activa_estandar", vip: "descuento_activa_vip" },
    inactiva: { estandar: "descuento_inactiva_estandar", vip: "descuento_inactiva_vip" },
    dormida: { estandar: "0", vip: "0" },
    reactivacion: { estandar: "descuento_reactivacion_estandar", vip: "descuento_reactivacion_vip" },
    nunca_compro: { estandar: "descuento_nunca_compro", vip: "0" },
  }
  const clave = mapa[estado]?.[nivel]
  if (!clave || clave === "0") return 0
  return Number(config[clave] || 0)
}

export async function clasificarClientas() {
  const supabase = await createClient()
  const config = await getClubConfig()
  const hoy = new Date()

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, email, pedidos:pedidos(id, monto_neto, monto_total, created_at, estado_interno)")

  const contadores = { activas: 0, inactivas: 0, dormidas: 0, reactivacion: 0, nunca_compro: 0, vip: 0, estandar: 0 }

  for (const cliente of clientes || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pedidosValidos = ((cliente as any).pedidos || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.estado_interno !== "cancelado")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const ultimaCompra = pedidosValidos[0]?.created_at ? new Date(pedidosValidos[0].created_at) : null
    const dias = ultimaCompra ? Math.floor((hoy.getTime() - ultimaCompra.getTime()) / 86400000) : null

    let estado: string
    if (pedidosValidos.length === 0) estado = "nunca_compro"
    else if (dias! <= Number(config.dias_inactiva || 30)) estado = "activa"
    else if (dias! <= Number(config.dias_dormida || 90)) estado = "inactiva"
    else if (dias! <= Number(config.dias_reactivacion || 150)) estado = "dormida"
    else estado = "reactivacion"

    const ultimas3 = pedidosValidos.slice(0, 3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promedio = ultimas3.length > 0 ? ultimas3.reduce((s: number, p: any) => s + Number(p.monto_neto || p.monto_total || 0), 0) / ultimas3.length : 0

    let nivel = promedio >= Number(config.umbral_vip || 300000) ? "vip" : "estandar"
    const racha = calcularRacha(pedidosValidos)
    if (racha >= Number(config.racha_subir_nivel || 12)) nivel = "vip"

    const descuento = getDescuento(estado, nivel, config)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalFacturado = pedidosValidos.reduce((s: number, p: any) => s + Number(p.monto_neto || p.monto_total || 0), 0)

    const { data: existing } = await supabase.from("club_ser_clientas").select("mejor_racha").eq("cliente_id", cliente.id).single()

    await supabase.from("club_ser_clientas").upsert({
      cliente_id: cliente.id,
      estado, nivel,
      promedio_compra: Math.round(promedio),
      ultima_compra_fecha: ultimaCompra?.toISOString().split("T")[0] || null,
      dias_desde_ultima_compra: dias,
      total_compras: pedidosValidos.length,
      total_facturado: Math.round(totalFacturado),
      racha_meses: racha,
      mejor_racha: Math.max(racha, existing?.mejor_racha || 0),
      descuento_actual: descuento,
      fecha_ultima_clasificacion: hoy.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: "cliente_id" })

    contadores[estado as keyof typeof contadores]++
    contadores[nivel as keyof typeof contadores]++
  }

  return { total: clientes?.length || 0, ...contadores }
}
