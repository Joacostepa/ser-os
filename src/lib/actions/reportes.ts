"use server"

import { createClient } from "@/lib/supabase/server"

// ============================================================
// GENERAL TAB
// ============================================================

export async function getResumenGeneral(desde: string, hasta: string, desdeAnterior: string) {
  const supabase = await createClient()

  const [{ data: pedidos }, { data: pedidosAnterior }, { data: pedidosActivos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("monto_total, monto_total_usd, saldo_pendiente, estado_interno")
      .gte("fecha_ingreso", desde)
      .lte("fecha_ingreso", hasta)
      .not("estado_interno", "eq", "cancelado"),
    supabase
      .from("pedidos")
      .select("monto_total")
      .gte("fecha_ingreso", desdeAnterior)
      .lt("fecha_ingreso", desde)
      .not("estado_interno", "eq", "cancelado"),
    supabase
      .from("pedidos")
      .select("saldo_pendiente, estado_interno")
      .not("estado_interno", "in", '("cerrado","cancelado")'),
  ])

  const facturacion = pedidos?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  const facturacionUsd = pedidos?.reduce((s, p) => s + Number(p.monto_total_usd || 0), 0) ?? 0
  const facturacionAnterior = pedidosAnterior?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  const totalPedidos = pedidos?.length ?? 0
  const ticketPromedio = totalPedidos > 0 ? facturacion / totalPedidos : 0

  const pedidosBloqueados = pedidosActivos?.filter(
    (p) => ["esperando_insumos", "esperando_diseno", "pendiente_sena", "pendiente_saldo"].includes(p.estado_interno)
  ).length ?? 0

  const totalDeuda = pedidosActivos?.filter((p) => Number(p.saldo_pendiente) > 0)
    .reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0
  const pedidosConDeuda = pedidosActivos?.filter((p) => Number(p.saldo_pendiente) > 0).length ?? 0

  return {
    facturacion, facturacionUsd, facturacionAnterior,
    totalPedidos, ticketPromedio,
    pedidosBloqueados, totalDeuda, pedidosConDeuda,
  }
}

export async function getAlertasActivas() {
  const supabase = await createClient()
  const hoy = new Date()
  const hace3dias = new Date(hoy.getTime() - 3 * 86400000).toISOString()
  const hace5dias = new Date(hoy.getTime() - 5 * 86400000).toISOString()

  const [{ data: sinSena }, { data: insumosStock }, { data: tareasVencidas }, { data: listosDespacho }, { data: sinCobrar }] = await Promise.all([
    // Pedidos sin seña hace 3+ días
    supabase.from("pedidos").select("id, numero_tn").eq("estado_interno", "pendiente_sena").lt("created_at", hace3dias),
    // Insumos bajo mínimo
    supabase.from("insumos").select("id, nombre, stock_actual, stock_minimo, unidad").eq("tipo", "material").eq("activo", true),
    // Tareas vencidas
    supabase.from("tareas").select("id, titulo, fecha_limite, pedido_id, pedido:pedidos(numero_tn)")
      .not("estado", "in", '("terminada","bloqueada")').lt("fecha_limite", hoy.toISOString()),
    // Listos para despachar
    supabase.from("pedidos").select("id").eq("estado_interno", "listo_para_despacho"),
    // Pedidos armados sin cobrar 5+ días
    supabase.from("pedidos").select("id, numero_tn, saldo_pendiente")
      .eq("estado_interno", "pendiente_saldo").lt("updated_at", hace5dias).gt("saldo_pendiente", 0),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Alert = { type: "red" | "amber" | "blue"; text: string; href?: string }
  const alertas: Alert[] = []

  // Red: sin seña
  sinSena?.forEach((p) => {
    alertas.push({ type: "red", text: `Pedido #${p.numero_tn || p.id.slice(0, 8)} — sin pago de seña hace +3 días`, href: `/pedidos/${p.id}` })
  })

  // Red: sin cobrar
  sinCobrar?.forEach((p) => {
    alertas.push({ type: "red", text: `Pedido #${p.numero_tn || p.id.slice(0, 8)} — armado, saldo $${Number(p.saldo_pendiente).toLocaleString("es-AR")} pendiente`, href: `/pedidos/${p.id}` })
  })

  // Amber: stock bajo
  insumosStock?.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0)
    .forEach((i) => {
      alertas.push({ type: "amber", text: `Stock crítico: ${i.nombre} (quedan ${Number(i.stock_actual)} ${i.unidad}, mín: ${Number(i.stock_minimo)})`, href: `/insumos/${i.id}` })
    })

  // Amber: tareas vencidas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tareasVencidas?.slice(0, 3).forEach((t: any) => {
    alertas.push({ type: "amber", text: `Tarea "${t.titulo}" vencida — Pedido #${t.pedido?.numero_tn || ""}`, href: t.pedido_id ? `/pedidos/${t.pedido_id}` : undefined })
  })

  // Blue: listos para despachar
  if (listosDespacho && listosDespacho.length > 0) {
    alertas.push({ type: "blue", text: `${listosDespacho.length} pedido${listosDespacho.length > 1 ? "s" : ""} listo${listosDespacho.length > 1 ? "s" : ""} para despachar` })
  }

  // Sort: red first, then amber, then blue
  alertas.sort((a, b) => {
    const order = { red: 0, amber: 1, blue: 2 }
    return order[a.type] - order[b.type]
  })

  return alertas.slice(0, 8)
}

export async function getEmbudoPedidos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("estado_interno")
    .not("estado_interno", "in", '("cerrado","cancelado","despachado")')

  const counts: Record<string, number> = {}
  data?.forEach((p) => { counts[p.estado_interno] = (counts[p.estado_interno] || 0) + 1 })

  const FUNNEL_ORDER = [
    { estado: "nuevo", label: "Nuevo", color: "#888780" },
    { estado: "pendiente_sena", label: "Pendiente de seña", color: "#EF9F27" },
    { estado: "sena_recibida", label: "Habilitado", color: "#378ADD" },
    { estado: "en_prearmado", label: "En pre-armado", color: "#378ADD" },
    { estado: "esperando_insumos", label: "Esperando insumos", color: "#E24B4A" },
    { estado: "listo_para_armar", label: "Listo para armar", color: "#534AB7" },
    { estado: "en_armado", label: "En armado", color: "#534AB7" },
    { estado: "armado_completo", label: "Armado completo", color: "#534AB7" },
    { estado: "pendiente_saldo", label: "Pendiente de saldo", color: "#EF9F27" },
    { estado: "listo_para_despacho", label: "Listo para despacho", color: "#639922" },
  ]

  const max = Math.max(...Object.values(counts), 1)
  return FUNNEL_ORDER
    .filter((e) => (counts[e.estado] || 0) > 0)
    .map((e) => ({
      ...e,
      value: counts[e.estado] || 0,
      width: `${Math.max(((counts[e.estado] || 0) / max) * 100, 8)}%`,
    }))
}

export async function getUltimasAcciones() {
  const supabase = await createClient()

  const [{ data: historial }, { data: pagosRecientes }, { data: tareasCompletas }] = await Promise.all([
    supabase.from("historial_pedido").select("accion, estado_nuevo, created_at, pedido:pedidos(numero_tn)")
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("pagos").select("monto, fecha, concepto, pedido:pedidos(numero_tn)")
      .eq("tipo", "cobro").order("created_at", { ascending: false }).limit(5),
    supabase.from("tareas").select("titulo, completada_en, pedido:pedidos(numero_tn)")
      .eq("estado", "terminada").not("completada_en", "is", null).order("completada_en", { ascending: false }).limit(5),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acciones: { texto: string; fecha: string }[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historial?.forEach((h: any) => {
    acciones.push({ texto: `${h.accion} — #${h.pedido?.numero_tn || ""}`, fecha: h.created_at })
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagosRecientes?.forEach((p: any) => {
    acciones.push({ texto: `Cobro recibido: #${p.pedido?.numero_tn || ""} — $${Number(p.monto).toLocaleString("es-AR")}`, fecha: p.fecha })
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tareasCompletas?.forEach((t: any) => {
    acciones.push({ texto: `Tarea completada: "${t.titulo}" — #${t.pedido?.numero_tn || ""}`, fecha: t.completada_en })
  })

  return acciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 8)
}

// ============================================================
// COMERCIAL TAB
// ============================================================

export async function getMetricasComerciales(desde: string, hasta: string, desdeAnterior: string) {
  const supabase = await createClient()

  const [{ data: pedidos }, { data: pedidosAnt }, { data: clientesNuevos }] = await Promise.all([
    supabase.from("pedidos").select("monto_total, cliente_id, tipo")
      .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta).not("estado_interno", "eq", "cancelado"),
    supabase.from("pedidos").select("monto_total")
      .gte("fecha_ingreso", desdeAnterior).lt("fecha_ingreso", desde).not("estado_interno", "eq", "cancelado"),
    // Clientes cuyo primer pedido es en este período
    supabase.from("clientes").select("id").gte("created_at", desde).lte("created_at", hasta),
  ])

  const ventas = pedidos?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  const ventasAnt = pedidosAnt?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  const totalPedidos = pedidos?.length ?? 0
  const clientesActivos = new Set(pedidos?.map((p) => p.cliente_id)).size
  const estandar = pedidos?.filter((p) => p.tipo === "estandar").length ?? 0
  const personalizado = pedidos?.filter((p) => p.tipo === "personalizado").length ?? 0

  return {
    ventas, ventasAnt, totalPedidos,
    ticketPromedio: totalPedidos > 0 ? ventas / totalPedidos : 0,
    clientesActivos, clientesNuevos: clientesNuevos?.length ?? 0,
    distribucion: [
      { name: "Estándar", value: estandar, monto: pedidos?.filter((p) => p.tipo === "estandar").reduce((s, p) => s + Number(p.monto_total), 0) ?? 0 },
      { name: "Personalizado", value: personalizado, monto: pedidos?.filter((p) => p.tipo === "personalizado").reduce((s, p) => s + Number(p.monto_total), 0) ?? 0 },
    ],
  }
}

export async function getTopClientes(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("monto_total, cliente:clientes(id, nombre)")
    .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const map: Record<string, { nombre: string; facturado: number; pedidos: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?.forEach((p: any) => {
    const id = p.cliente?.id
    if (!id) return
    if (!map[id]) map[id] = { nombre: p.cliente.nombre, facturado: 0, pedidos: 0 }
    map[id].facturado += Number(p.monto_total)
    map[id].pedidos++
  })

  return Object.values(map).sort((a, b) => b.facturado - a.facturado).slice(0, 10)
}

export async function getTopProductos(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("items_pedido")
    .select("cantidad, descripcion, producto:productos(nombre), pedido:pedidos!inner(fecha_ingreso, estado_interno)")
    .gte("pedido.fecha_ingreso", desde).lte("pedido.fecha_ingreso", hasta)
    .not("pedido.estado_interno", "eq", "cancelado")

  const map: Record<string, { nombre: string; unidades: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?.forEach((i: any) => {
    const nombre = i.producto?.nombre || i.descripcion
    if (!map[nombre]) map[nombre] = { nombre, unidades: 0 }
    map[nombre].unidades += Number(i.cantidad)
  })

  return Object.values(map).sort((a, b) => b.unidades - a.unidades).slice(0, 10)
}

export async function getEvolucionMensual(meses: number = 6) {
  const supabase = await createClient()

  const desde = new Date()
  desde.setMonth(desde.getMonth() - meses + 1)
  desde.setDate(1)
  desde.setHours(0, 0, 0, 0)

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("monto_total, monto_total_usd, fecha_ingreso")
    .gte("fecha_ingreso", desde.toISOString())
    .not("estado_interno", "eq", "cancelado")

  const mesesMap: Record<string, { mes: string; facturacion: number; usd: number; pedidos: number }> = {}

  for (let i = 0; i < meses; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - meses + 1 + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    mesesMap[key] = { mes: key, facturacion: 0, usd: 0, pedidos: 0 }
  }

  pedidos?.forEach((p) => {
    const date = new Date(p.fecha_ingreso)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (mesesMap[key]) {
      mesesMap[key].facturacion += Number(p.monto_total)
      mesesMap[key].usd += Number(p.monto_total_usd || 0)
      mesesMap[key].pedidos++
    }
  })

  return Object.values(mesesMap)
}

// ============================================================
// OPERATIVO TAB
// ============================================================

export async function getMetricasOperativas(desde: string, hasta: string) {
  const supabase = await createClient()

  const hoy = new Date().toISOString().split("T")[0]

  const [{ data: tareasHoy }, { count: tareasAsignadas }] = await Promise.all([
    supabase.from("tareas").select("id").eq("estado", "terminada").gte("completada_en", `${hoy}T00:00:00`),
    supabase.from("tareas").select("id", { count: "exact", head: true }).lte("fecha_limite", `${hoy}T23:59:59`).gte("fecha_limite", `${hoy}T00:00:00`),
  ])

  return {
    tareasCompletadasHoy: tareasHoy?.length ?? 0,
    tareasAsignadasHoy: tareasAsignadas ?? 0,
  }
}

export async function getRendimientoEquipo(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: tareas } = await supabase
    .from("tareas")
    .select("estado, area, responsable:usuarios(nombre)")
    .gte("created_at", desde).lte("created_at", hasta)

  const map: Record<string, { nombre: string; completadas: number; total: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tareas?.forEach((t: any) => {
    const key = t.responsable?.nombre || t.area || "Sin asignar"
    if (!map[key]) map[key] = { nombre: key, completadas: 0, total: 0 }
    map[key].total++
    if (t.estado === "terminada") map[key].completadas++
  })

  return Object.values(map)
    .map((r) => ({ ...r, porcentaje: r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0 }))
    .sort((a, b) => a.porcentaje - b.porcentaje)
}

// ============================================================
// RENTABILIDAD TAB
// ============================================================

export async function getRentabilidadPorPedido(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("id, numero_tn, monto_total, monto_total_usd, cliente:clientes(nombre), items:items_pedido(cantidad, costo_unitario)")
    .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")
    .order("monto_total", { ascending: false }).limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const costo = p.items?.reduce((s: number, i: any) => s + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0
    const monto = Number(p.monto_total)
    const margen = monto - costo
    return {
      id: p.id, numero_tn: p.numero_tn, cliente: p.cliente?.nombre || "—",
      monto, costo, margen, margen_pct: monto > 0 ? (margen / monto) * 100 : 0,
      usd: Number(p.monto_total_usd || 0),
    }
  })
}

export async function getRentabilidadPorCliente(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("monto_total, cliente:clientes(id, nombre, categoria), items:items_pedido(cantidad, costo_unitario)")
    .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const map: Record<string, { id: string; nombre: string; categoria: string; facturado: number; costo: number; pedidos: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?.forEach((p: any) => {
    const cId = p.cliente?.id
    if (!cId) return
    if (!map[cId]) map[cId] = { id: cId, nombre: p.cliente.nombre, categoria: p.cliente.categoria, facturado: 0, costo: 0, pedidos: 0 }
    map[cId].facturado += Number(p.monto_total)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map[cId].costo += p.items?.reduce((s: number, i: any) => s + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0
    map[cId].pedidos++
  })

  return Object.values(map)
    .map((c) => ({ ...c, margen: c.facturado - c.costo, margen_pct: c.facturado > 0 ? ((c.facturado - c.costo) / c.facturado) * 100 : 0 }))
    .sort((a, b) => b.facturado - a.facturado)
}

export async function getEstadoResultados(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("monto_total, items:items_pedido(cantidad, costo_unitario)")
    .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const { data: gastos } = await supabase
    .from("pagos")
    .select("monto")
    .eq("tipo", "gasto")
    .gte("fecha", desde.split("T")[0]).lte("fecha", hasta.split("T")[0])

  const { data: pagosProveedor } = await supabase
    .from("pagos")
    .select("monto")
    .eq("tipo", "pago_proveedor")
    .gte("fecha", desde.split("T")[0]).lte("fecha", hasta.split("T")[0])

  const ventasBrutas = pedidos?.reduce((s, p) => s + Number(p.monto_total), 0) ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmv = pedidos?.reduce((s, p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return s + (p.items?.reduce((si: number, i: any) => si + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0)
  }, 0) ?? 0
  const totalGastos = gastos?.reduce((s, g) => s + Number(g.monto), 0) ?? 0
  const totalPagosProveedor = pagosProveedor?.reduce((s, p) => s + Number(p.monto), 0) ?? 0

  const margenBruto = ventasBrutas - cmv
  const resultado = margenBruto - totalGastos - totalPagosProveedor

  return {
    ventasBrutas, cmv, margenBruto,
    margenBrutoPct: ventasBrutas > 0 ? (margenBruto / ventasBrutas) * 100 : 0,
    gastosOperativos: totalGastos + totalPagosProveedor,
    resultado,
    resultadoPct: ventasBrutas > 0 ? (resultado / ventasBrutas) * 100 : 0,
  }
}

// ============================================================
// STOCK TAB
// ============================================================

export async function getMetricasStock() {
  const supabase = await createClient()

  const [{ data: insumos }, { data: comprasPendientes }] = await Promise.all([
    supabase.from("insumos").select("id, nombre, stock_actual, stock_minimo, costo_unitario, unidad").eq("tipo", "material").eq("activo", true),
    supabase.from("compras").select("id, proveedor:proveedores(nombre), fecha_esperada, estado")
      .in("estado", ["enviada", "confirmada", "recibida_parcial"]),
  ])

  const stockCritico = insumos?.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0) ?? []
  const valorInventario = insumos?.reduce((s, i) => s + (Number(i.stock_actual) * Number(i.costo_unitario)), 0) ?? 0

  const hoy = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compras = (comprasPendientes || []).map((c: any) => {
    const esperada = c.fecha_esperada ? new Date(c.fecha_esperada) : null
    return {
      id: c.id, proveedor: c.proveedor?.nombre || "—", estado: c.estado,
      fecha_esperada: c.fecha_esperada,
      dias_atraso: esperada ? Math.max(0, Math.floor((hoy.getTime() - esperada.getTime()) / 86400000)) : 0,
    }
  })

  return { stockCritico, valorInventario, comprasPendientes: compras }
}

// ============================================================
// FINANCIERO TAB
// ============================================================

export async function getMetricasFinancieras(desde: string, hasta: string) {
  const supabase = await createClient()

  const [{ data: pedidosDeuda }, { data: cobros }, { data: egresos }] = await Promise.all([
    supabase.from("pedidos").select("id, saldo_pendiente, created_at")
      .gt("saldo_pendiente", 0).not("estado_interno", "in", '("cerrado","cancelado")'),
    supabase.from("pagos").select("monto").eq("tipo", "cobro")
      .gte("fecha", desde.split("T")[0]).lte("fecha", hasta.split("T")[0]),
    supabase.from("pagos").select("monto, tipo")
      .in("tipo", ["pago_proveedor", "gasto"])
      .gte("fecha", desde.split("T")[0]).lte("fecha", hasta.split("T")[0]),
  ])

  const totalACobrar = pedidosDeuda?.reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0
  const pedidosConSaldo = pedidosDeuda?.length ?? 0
  const totalCobros = cobros?.reduce((s, p) => s + Number(p.monto), 0) ?? 0
  const totalEgresos = egresos?.reduce((s, p) => s + Number(p.monto), 0) ?? 0
  const flujoCaja = totalCobros - totalEgresos

  // Antigüedad de cuentas a cobrar
  const hoy = new Date()
  const franjas = { "0-15 días": 0, "16-30 días": 0, "31-60 días": 0, "60+ días": 0 }
  pedidosDeuda?.forEach((p) => {
    const dias = Math.floor((hoy.getTime() - new Date(p.created_at).getTime()) / 86400000)
    const saldo = Number(p.saldo_pendiente)
    if (dias <= 15) franjas["0-15 días"] += saldo
    else if (dias <= 30) franjas["16-30 días"] += saldo
    else if (dias <= 60) franjas["31-60 días"] += saldo
    else franjas["60+ días"] += saldo
  })

  return {
    totalACobrar, pedidosConSaldo, totalCobros, totalEgresos, flujoCaja,
    antiguedad: Object.entries(franjas).map(([franja, monto]) => ({
      franja, monto, porcentaje: totalACobrar > 0 ? (monto / totalACobrar) * 100 : 0,
    })),
  }
}
