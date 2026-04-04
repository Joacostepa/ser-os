"use server"

import { createClient } from "@/lib/supabase/server"

export async function getResumenGeneral(desde: string, hasta: string) {
  const supabase = await createClient()

  // Pedidos in period
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, monto_total, monto_pagado, saldo_pendiente, monto_total_usd, estado_interno, tipo, created_at")
    .gte("fecha_ingreso", desde)
    .lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  // Previous period (same duration)
  const desdeDt = new Date(desde)
  const hastaDt = new Date(hasta)
  const duracionMs = hastaDt.getTime() - desdeDt.getTime()
  const desdeAnterior = new Date(desdeDt.getTime() - duracionMs).toISOString()

  const { data: pedidosAnterior } = await supabase
    .from("pedidos")
    .select("monto_total")
    .gte("fecha_ingreso", desdeAnterior)
    .lt("fecha_ingreso", desde)
    .not("estado_interno", "eq", "cancelado")

  // All active pedidos for deuda
  const { data: pedidosActivos } = await supabase
    .from("pedidos")
    .select("saldo_pendiente")
    .not("estado_interno", "in", '("cerrado","cancelado")')
    .gt("saldo_pendiente", 0)

  // Pedidos por estado (all active)
  const { data: allPedidos } = await supabase
    .from("pedidos")
    .select("estado_interno")
    .not("estado_interno", "in", '("cerrado","cancelado")')

  const facturacionArs = pedidos?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  const facturacionUsd = pedidos?.reduce((s, p) => s + Number(p.monto_total_usd || 0), 0) ?? 0
  const facturacionAnterior = pedidosAnterior?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  const variacionPct = facturacionAnterior > 0
    ? ((facturacionArs - facturacionAnterior) / facturacionAnterior) * 100
    : 0

  const totalDeuda = pedidosActivos?.reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0
  const pedidosConDeuda = pedidosActivos?.length ?? 0

  // Count by estado
  const estadoCounts: Record<string, number> = {}
  allPedidos?.forEach((p) => {
    estadoCounts[p.estado_interno] = (estadoCounts[p.estado_interno] || 0) + 1
  })

  const totalPedidos = pedidos?.length ?? 0
  const ticketPromedio = totalPedidos > 0 ? facturacionArs / totalPedidos : 0

  return {
    facturacionArs,
    facturacionUsd,
    variacionPct,
    totalPedidos,
    ticketPromedio,
    totalDeuda,
    pedidosConDeuda,
    pedidosPorEstado: Object.entries(estadoCounts).map(([estado, count]) => ({ estado, count })),
  }
}

export async function getEvolucionMensual(meses: number = 6) {
  const supabase = await createClient()

  const desde = new Date()
  desde.setMonth(desde.getMonth() - meses + 1)
  desde.setDate(1)
  desde.setHours(0, 0, 0, 0)

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("monto_total, monto_total_usd, fecha_ingreso, estado_interno")
    .gte("fecha_ingreso", desde.toISOString())
    .not("estado_interno", "eq", "cancelado")

  const { data: pagos } = await supabase
    .from("pagos")
    .select("monto, tipo, fecha")
    .gte("fecha", desde.toISOString().split("T")[0])

  // Group by month
  const mesesMap: Record<string, {
    mes: string
    facturacion_ars: number
    facturacion_usd: number
    pedidos_count: number
    cobros: number
    gastos: number
  }> = {}

  for (let i = 0; i < meses; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - meses + 1 + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    mesesMap[key] = {
      mes: key,
      facturacion_ars: 0,
      facturacion_usd: 0,
      pedidos_count: 0,
      cobros: 0,
      gastos: 0,
    }
  }

  pedidos?.forEach((p) => {
    const date = new Date(p.fecha_ingreso)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (mesesMap[key]) {
      mesesMap[key].facturacion_ars += Number(p.monto_total)
      mesesMap[key].facturacion_usd += Number(p.monto_total_usd || 0)
      mesesMap[key].pedidos_count++
    }
  })

  pagos?.forEach((p) => {
    const date = new Date(p.fecha)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (mesesMap[key]) {
      if (p.tipo === "cobro") {
        mesesMap[key].cobros += Number(p.monto)
      } else {
        mesesMap[key].gastos += Number(p.monto)
      }
    }
  })

  return Object.values(mesesMap)
}

export async function getRentabilidadPorCliente(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(`
      id, monto_total, monto_total_usd, fecha_ingreso,
      cliente:clientes(id, nombre, categoria),
      items:items_pedido(cantidad, precio_unitario, costo_unitario)
    `)
    .gte("fecha_ingreso", desde)
    .lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  // Aggregate by client
  const clienteMap: Record<string, {
    id: string
    nombre: string
    categoria: string
    total_pedidos: number
    total_facturado: number
    total_facturado_usd: number
    total_costo: number
    ultimo_pedido: string
  }> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedidos?.forEach((p: any) => {
    const clienteId = p.cliente?.id
    if (!clienteId) return

    if (!clienteMap[clienteId]) {
      clienteMap[clienteId] = {
        id: clienteId,
        nombre: p.cliente.nombre,
        categoria: p.cliente.categoria,
        total_pedidos: 0,
        total_facturado: 0,
        total_facturado_usd: 0,
        total_costo: 0,
        ultimo_pedido: p.fecha_ingreso,
      }
    }

    const c = clienteMap[clienteId]
    c.total_pedidos++
    c.total_facturado += Number(p.monto_total)
    c.total_facturado_usd += Number(p.monto_total_usd || 0)

    // Calculate cost from items
    const costoPedido = p.items?.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: number, i: any) => s + (Number(i.costo_unitario || 0) * Number(i.cantidad)),
      0
    ) ?? 0
    c.total_costo += costoPedido

    if (p.fecha_ingreso > c.ultimo_pedido) {
      c.ultimo_pedido = p.fecha_ingreso
    }
  })

  return Object.values(clienteMap)
    .map((c) => ({
      ...c,
      ticket_promedio: c.total_pedidos > 0 ? c.total_facturado / c.total_pedidos : 0,
      margen_bruto: c.total_facturado - c.total_costo,
      margen_pct: c.total_facturado > 0
        ? ((c.total_facturado - c.total_costo) / c.total_facturado) * 100
        : 0,
    }))
    .sort((a, b) => b.total_facturado - a.total_facturado)
}

export async function getRentabilidadPorPedido(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(`
      id, numero_tn, monto_total, monto_total_usd, estado_interno, fecha_ingreso,
      cliente:clientes(nombre),
      items:items_pedido(cantidad, precio_unitario, costo_unitario)
    `)
    .gte("fecha_ingreso", desde)
    .lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")
    .order("monto_total", { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pedidos || []).map((p: any) => {
    const costoTotal = p.items?.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: number, i: any) => s + (Number(i.costo_unitario || 0) * Number(i.cantidad)),
      0
    ) ?? 0
    const montoTotal = Number(p.monto_total)
    const margenBruto = montoTotal - costoTotal
    const margenPct = montoTotal > 0 ? (margenBruto / montoTotal) * 100 : 0

    return {
      id: p.id,
      numero_tn: p.numero_tn,
      cliente: p.cliente?.nombre || "—",
      monto_total: montoTotal,
      monto_total_usd: Number(p.monto_total_usd || 0),
      costo_total: costoTotal,
      margen_bruto: margenBruto,
      margen_pct: margenPct,
    }
  })
}

export async function getAlertasActivas() {
  const supabase = await createClient()

  // Insumos stock bajo
  const { data: insumos } = await supabase
    .from("insumos")
    .select("id, nombre, stock_actual, stock_minimo, unidad")
    .eq("tipo", "material")
    .eq("activo", true)

  const insumosStockBajo = insumos?.filter(
    (i) => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0
  ) ?? []

  // Compras pendientes
  const { data: compras } = await supabase
    .from("compras")
    .select("id, fecha_esperada, proveedor:proveedores(nombre)")
    .in("estado", ["enviada", "confirmada", "recibida_parcial"])

  const hoy = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comprasPendientes = (compras || []).map((c: any) => {
    const esperada = c.fecha_esperada ? new Date(c.fecha_esperada) : null
    const diasAtraso = esperada ? Math.floor((hoy.getTime() - esperada.getTime()) / 86400000) : 0
    return {
      id: c.id,
      proveedor: c.proveedor?.nombre || "—",
      fecha_esperada: c.fecha_esperada,
      dias_atraso: Math.max(0, diasAtraso),
    }
  })

  // Pedidos sin pagar (saldo > 0, más de 7 días)
  const { data: pedidosSinPagar } = await supabase
    .from("pedidos")
    .select("id, numero_tn, saldo_pendiente, created_at, cliente:clientes(nombre)")
    .gt("saldo_pendiente", 0)
    .not("estado_interno", "in", '("cerrado","cancelado")')
    .order("saldo_pendiente", { ascending: false })
    .limit(10)

  return {
    insumosStockBajo,
    comprasPendientes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pedidosSinPagar: (pedidosSinPagar || []).map((p: any) => ({
      id: p.id,
      numero_tn: p.numero_tn,
      cliente: p.cliente?.nombre || "—",
      saldo: Number(p.saldo_pendiente),
      dias: Math.floor((hoy.getTime() - new Date(p.created_at).getTime()) / 86400000),
    })),
  }
}

export async function getDistribucionPedidos(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("tipo")
    .gte("fecha_ingreso", desde)
    .lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const estandar = pedidos?.filter((p) => p.tipo === "estandar").length ?? 0
  const personalizado = pedidos?.filter((p) => p.tipo === "personalizado").length ?? 0

  return [
    { name: "Estándar", value: estandar },
    { name: "Personalizado", value: personalizado },
  ]
}

export async function getTopClientes(desde: string, hasta: string, limit: number = 10) {
  const clientes = await getRentabilidadPorCliente(desde, hasta)
  return clientes.slice(0, limit)
}
