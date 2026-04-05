"use server"

import { createClient } from "@/lib/supabase/server"
import { getClubConfig } from "./config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularRacha(pedidos: { fecha: string }[]): number {
  if (pedidos.length === 0) return 0
  let racha = 0
  const hoy = new Date()
  let mes = hoy.getMonth()
  let anio = hoy.getFullYear()

  for (let i = 0; i < 24; i++) {
    const hay = pedidos.some((p) => {
      const f = new Date(p.fecha)
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

  // 1. Get all client IDs
  const { data: clientes } = await supabase.from("clientes").select("id").limit(5000)

  // 2. Get ALL pedidos separately
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("cliente_id, monto_neto, monto_total, fecha_ingreso, created_at, estado_interno")
    .not("estado_interno", "eq", "cancelado")
    .order("fecha_ingreso", { ascending: false, nullsFirst: false })
    .limit(10000)

  // 3. Group pedidos by cliente_id
  const pedidosPorCliente = new Map<string, { fecha: string; monto: number }[]>()
  for (const p of pedidos || []) {
    if (!p.cliente_id) continue
    const fecha = p.fecha_ingreso || p.created_at
    const monto = Number(p.monto_neto || p.monto_total || 0)
    if (!pedidosPorCliente.has(p.cliente_id)) pedidosPorCliente.set(p.cliente_id, [])
    pedidosPorCliente.get(p.cliente_id)!.push({ fecha, monto })
  }

  // 4. Classify all clients in memory
  const contadores = { activas: 0, inactivas: 0, dormidas: 0, reactivacion: 0, nunca_compro: 0, vip: 0, estandar: 0 }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = []

  for (const cliente of clientes || []) {
    const pedidosCliente = pedidosPorCliente.get(cliente.id) || []

    const ultimaCompra = pedidosCliente[0]?.fecha ? new Date(pedidosCliente[0].fecha) : null
    const dias = ultimaCompra ? Math.floor((hoy.getTime() - ultimaCompra.getTime()) / 86400000) : null

    let estado: string
    if (pedidosCliente.length === 0) estado = "nunca_compro"
    else if (dias! <= Number(config.dias_inactiva || 30)) estado = "activa"
    else if (dias! <= Number(config.dias_dormida || 90)) estado = "inactiva"
    else if (dias! <= Number(config.dias_reactivacion || 150)) estado = "dormida"
    else estado = "reactivacion"

    const ultimas3 = pedidosCliente.slice(0, 3)
    const promedio = ultimas3.length > 0 ? ultimas3.reduce((s, p) => s + p.monto, 0) / ultimas3.length : 0

    let nivel = promedio >= Number(config.umbral_vip || 300000) ? "vip" : "estandar"
    const racha = calcularRacha(pedidosCliente)
    if (racha >= Number(config.racha_subir_nivel || 12)) nivel = "vip"

    const descuento = getDescuento(estado, nivel, config)
    const totalFacturado = pedidosCliente.reduce((s, p) => s + p.monto, 0)

    rows.push({
      cliente_id: cliente.id,
      estado, nivel,
      promedio_compra: Math.round(promedio),
      ultima_compra_fecha: ultimaCompra?.toISOString().split("T")[0] || null,
      dias_desde_ultima_compra: dias,
      total_compras: pedidosCliente.length,
      total_facturado: Math.round(totalFacturado),
      racha_meses: racha,
      mejor_racha: racha,
      descuento_actual: descuento,
      fecha_ultima_clasificacion: hoy.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })

    contadores[estado as keyof typeof contadores]++
    contadores[nivel as keyof typeof contadores]++
  }

  // 5. Batch upsert in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    await supabase.from("club_ser_clientas").upsert(chunk, { onConflict: "cliente_id" })
  }

  return { total: clientes?.length || 0, ...contadores }
}
