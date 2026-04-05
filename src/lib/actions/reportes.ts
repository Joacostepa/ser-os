"use server"

import { createClient } from "@/lib/supabase/server"
import { calcularNeto, calcularIVA } from "@/lib/iva"
import { ESTADOS_INTERNOS, CATEGORIA_IVA_DEFAULT } from "@/lib/constants"

// ============================================================
// Helpers
// ============================================================

const ESTADOS_INACTIVOS = ["cancelado", "cerrado", "entregado", "despachado"]
const ESTADOS_INACTIVOS_FILTER = `(${ESTADOS_INACTIVOS.map((e) => `"${e}"`).join(",")})`

function neto(montoNeto: number | null, montoTotal: number | null): number {
  if (montoNeto && Number(montoNeto) > 0) return Number(montoNeto)
  if (montoTotal && Number(montoTotal) > 0) return calcularNeto(Number(montoTotal))
  return 0
}

// ============================================================
// GENERAL TAB
// ============================================================

export async function getResumenGeneral(desde: string, hasta: string, desdeAnterior: string) {
  const supabase = await createClient()

  const [{ data: pedidos }, { data: pedidosAnterior }, { data: pedidosActivos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("monto_total, monto_neto, monto_total_usd, saldo_pendiente, estado_interno")
      .gte("fecha_ingreso", desde)
      .lte("fecha_ingreso", hasta)
      .not("estado_interno", "eq", "cancelado"),
    supabase
      .from("pedidos")
      .select("monto_total, monto_neto")
      .gte("fecha_ingreso", desdeAnterior)
      .lt("fecha_ingreso", desde)
      .not("estado_interno", "eq", "cancelado"),
    supabase
      .from("pedidos")
      .select("saldo_pendiente, estado_interno")
      .not("estado_interno", "in", ESTADOS_INACTIVOS_FILTER),
  ])

  const facturacion = pedidos?.reduce((s, p) => s + neto(p.monto_neto, p.monto_total), 0) ?? 0
  const facturacionUsd = pedidos?.reduce((s, p) => s + Number(p.monto_total_usd || 0), 0) ?? 0
  const facturacionAnterior = pedidosAnterior?.reduce((s, p) => s + neto(p.monto_neto, p.monto_total), 0) ?? 0
  const totalPedidos = pedidos?.length ?? 0
  const ticketPromedio = totalPedidos > 0 ? facturacion / totalPedidos : 0

  // Active pedidos (not in inactive states)
  const pedidosActivosCount = pedidosActivos?.length ?? 0

  // Desglose by key states
  const desglose: Record<string, number> = {}
  pedidosActivos?.forEach((p) => {
    desglose[p.estado_interno] = (desglose[p.estado_interno] || 0) + 1
  })
  const pedidosActivosDesglose = Object.entries(desglose)
    .map(([estado, count]) => ({
      estado,
      label: ESTADOS_INTERNOS[estado]?.label || estado,
      count,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)

  // Deuda
  const totalDeuda = pedidosActivos?.filter((p) => Number(p.saldo_pendiente) > 0)
    .reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0
  const pedidosConDeuda = pedidosActivos?.filter((p) => Number(p.saldo_pendiente) > 0).length ?? 0

  return {
    facturacion, facturacionUsd, facturacionAnterior,
    totalPedidos, ticketPromedio,
    pedidosActivosCount, pedidosActivosDesglose,
    totalDeuda, pedidosConDeuda,
  }
}

export async function getAlertasActivas() {
  const supabase = await createClient()
  const hoy = new Date()
  const hace3dias = new Date(hoy.getTime() - 3 * 86400000).toISOString()
  const hace5dias = new Date(hoy.getTime() - 5 * 86400000).toISOString()

  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split("T")[0]

  const [
    { data: sinSena },
    { data: insumosStock },
    { data: tareasVencidas },
    { data: listosDespacho },
    { data: sinCobrar },
    { count: sinClasificar },
    { data: gastosRecurrentes },
    { data: gastosMes },
    { data: pedidosEstancados },
    { data: comprasPendientes },
  ] = await Promise.all([
    // Pedidos sin sena hace 3+ dias
    supabase.from("pedidos").select("id, numero_tn, numero_interno")
      .eq("estado_interno", "pendiente_sena").lt("created_at", hace3dias),
    // Insumos bajo minimo
    supabase.from("insumos").select("id, nombre, stock_actual, stock_minimo, unidad")
      .eq("tipo", "material").eq("activo", true),
    // Tareas vencidas
    supabase.from("tareas").select("id, titulo, fecha_limite, pedido_id, pedido:pedidos(numero_tn, numero_interno)")
      .not("estado", "in", '("terminada","bloqueada")').lt("fecha_limite", hoy.toISOString()),
    // Listos para despachar
    supabase.from("pedidos").select("id").eq("estado_interno", "listo_para_despacho"),
    // Pedidos armados sin cobrar 5+ dias
    supabase.from("pedidos").select("id, numero_tn, numero_interno, saldo_pendiente")
      .eq("estado_interno", "pendiente_saldo").lt("updated_at", hace5dias).gt("saldo_pendiente", 0),
    // Pedidos sin clasificar
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .eq("tipo", "sin_clasificar")
      .not("estado_interno", "in", '("cancelado","cerrado")'),
    // Gastos recurrentes (plantillas)
    supabase.from("gastos").select("descripcion, cuenta_id").eq("recurrente", true),
    // Gastos ya cargados este mes
    supabase.from("gastos").select("descripcion, cuenta_id").gte("fecha", primerDiaMes),
    // Pedidos estancados: activos sin actualizacion hace 5+ dias
    supabase.from("pedidos").select("id, numero_tn, numero_interno, estado_interno")
      .not("estado_interno", "in", ESTADOS_INACTIVOS_FILTER)
      .lt("updated_at", hace5dias),
    // Compras pendientes
    supabase.from("compras").select("id, numero_orden")
      .in("estado", ["enviada", "confirmada", "recibida_parcial"]),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Alert = { type: "red" | "amber" | "blue"; text: string; href?: string }
  const alertas: Alert[] = []

  // Red: sin sena
  sinSena?.forEach((p) => {
    const num = p.numero_tn || p.numero_interno || p.id.slice(0, 8)
    alertas.push({ type: "red", text: `Pedido #${num} — sin pago de seña hace +3 días`, href: `/pedidos/${p.id}` })
  })

  // Red: sin cobrar
  sinCobrar?.forEach((p) => {
    const num = p.numero_tn || p.numero_interno || p.id.slice(0, 8)
    alertas.push({ type: "red", text: `Pedido #${num} — armado, saldo $${Number(p.saldo_pendiente).toLocaleString("es-AR")} pendiente`, href: `/pedidos/${p.id}` })
  })

  // Amber: stock bajo
  insumosStock?.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0)
    .forEach((i) => {
      alertas.push({ type: "amber", text: `Stock crítico: ${i.nombre} (quedan ${Number(i.stock_actual)} ${i.unidad}, mín: ${Number(i.stock_minimo)})`, href: `/insumos/${i.id}` })
    })

  // Amber: tareas vencidas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tareasVencidas?.slice(0, 3).forEach((t: any) => {
    const pedidoNum = t.pedido?.numero_tn || t.pedido?.numero_interno || ""
    alertas.push({ type: "amber", text: `Tarea "${t.titulo}" vencida — Pedido #${pedidoNum}`, href: t.pedido_id ? `/pedidos/${t.pedido_id}` : undefined })
  })

  // Amber: pedidos sin clasificar
  if (sinClasificar && sinClasificar > 0) {
    alertas.push({ type: "amber", text: `${sinClasificar} pedido${sinClasificar > 1 ? "s" : ""} sin clasificar. Clasificalos para poder habilitarlos.`, href: "/pedidos" })
  }

  // Amber: gastos recurrentes pendientes de cargar este mes
  if (gastosRecurrentes && gastosRecurrentes.length > 0) {
    const gastosMesKeys = new Set(
      (gastosMes || []).map((g) => `${g.descripcion}|${g.cuenta_id}`)
    )
    const recurrentesUnicas = new Map<string, string>()
    for (const g of gastosRecurrentes) {
      const key = `${g.descripcion}|${g.cuenta_id}`
      if (!gastosMesKeys.has(key) && !recurrentesUnicas.has(key)) {
        recurrentesUnicas.set(key, g.descripcion)
      }
    }
    if (recurrentesUnicas.size > 0) {
      alertas.push({
        type: "amber",
        text: `${recurrentesUnicas.size} gasto${recurrentesUnicas.size > 1 ? "s" : ""} recurrente${recurrentesUnicas.size > 1 ? "s" : ""} pendiente${recurrentesUnicas.size > 1 ? "s" : ""} de cargar este mes`,
        href: "/gastos",
      })
    }
  }

  // Amber: pedidos estancados
  if (pedidosEstancados && pedidosEstancados.length > 0) {
    alertas.push({
      type: "amber",
      text: `${pedidosEstancados.length} pedido${pedidosEstancados.length > 1 ? "s" : ""} estancado${pedidosEstancados.length > 1 ? "s" : ""} (sin movimiento hace +5 días)`,
      href: "/pedidos",
    })
  }

  // Amber: compras pendientes
  if (comprasPendientes && comprasPendientes.length > 0) {
    alertas.push({
      type: "amber",
      text: `${comprasPendientes.length} compra${comprasPendientes.length > 1 ? "s" : ""} pendiente${comprasPendientes.length > 1 ? "s" : ""} de recibir`,
      href: "/compras",
    })
  }

  // Blue: listos para despachar
  if (listosDespacho && listosDespacho.length > 0) {
    alertas.push({ type: "blue", text: `${listosDespacho.length} pedido${listosDespacho.length > 1 ? "s" : ""} listo${listosDespacho.length > 1 ? "s" : ""} para despachar` })
  }

  // Sort: red first, then amber, then blue
  alertas.sort((a, b) => {
    const order = { red: 0, amber: 1, blue: 2 }
    return order[a.type] - order[b.type]
  })

  return alertas.slice(0, 10)
}

export async function getEmbudoPedidos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("estado_interno, tipo")
    .not("estado_interno", "in", ESTADOS_INACTIVOS_FILTER)

  const counts: Record<string, number> = {}
  let sinClasificarCount = 0
  data?.forEach((p) => {
    counts[p.estado_interno] = (counts[p.estado_interno] || 0) + 1
    if (p.tipo === "sin_clasificar") sinClasificarCount++
  })

  // Build embudo from all known states, using ESTADOS_INTERNOS for labels
  const result = Object.entries(counts)
    .map(([estado, count]) => ({
      estado,
      label: ESTADOS_INTERNOS[estado]?.label || estado,
      count,
    }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)

  return { embudo: result, sinClasificarCount }
}

export async function getUltimasAcciones() {
  const supabase = await createClient()

  const [{ data: historial }, { data: pagosRecientes }, { data: tareasCompletas }] = await Promise.all([
    supabase.from("historial_pedido")
      .select("accion, estado_nuevo, created_at, pedido:pedidos(id, numero_tn, numero_interno)")
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("pagos")
      .select("monto, fecha, concepto, pedido:pedidos(id, numero_tn, numero_interno)")
      .eq("tipo", "cobro").order("created_at", { ascending: false }).limit(10),
    supabase.from("tareas")
      .select("titulo, completada_en, pedido:pedidos(id, numero_tn, numero_interno)")
      .eq("estado", "terminada").not("completada_en", "is", null)
      .order("completada_en", { ascending: false }).limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acciones: { texto: string; fecha: string; numero: string; tipo: "pago" | "estado" | "creacion" }[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historial?.forEach((h: any) => {
    const num = h.pedido?.numero_tn || h.pedido?.numero_interno || h.pedido?.id?.slice(0, 8) || ""
    acciones.push({ texto: h.accion, fecha: h.created_at, numero: num, tipo: "estado" })
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagosRecientes?.forEach((p: any) => {
    const num = p.pedido?.numero_tn || p.pedido?.numero_interno || p.pedido?.id?.slice(0, 8) || ""
    acciones.push({ texto: `Cobro recibido — $${Number(p.monto).toLocaleString("es-AR")}`, fecha: p.fecha, numero: num, tipo: "pago" })
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tareasCompletas?.forEach((t: any) => {
    const num = t.pedido?.numero_tn || t.pedido?.numero_interno || t.pedido?.id?.slice(0, 8) || ""
    acciones.push({ texto: `Tarea completada: "${t.titulo}"`, fecha: t.completada_en, numero: num, tipo: "creacion" })
  })

  return acciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10)
}

// ============================================================
// COMERCIAL TAB
// ============================================================

export async function getMetricasComerciales(desde: string, hasta: string, desdeAnterior: string) {
  const supabase = await createClient()

  const [{ data: pedidos }, { data: pedidosAnt }, { data: clientesNuevos }] = await Promise.all([
    supabase.from("pedidos").select("monto_total, monto_neto, monto_total_usd, cliente_id, tipo, canal")
      .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta).not("estado_interno", "eq", "cancelado"),
    supabase.from("pedidos").select("monto_total, monto_neto")
      .gte("fecha_ingreso", desdeAnterior).lt("fecha_ingreso", desde).not("estado_interno", "eq", "cancelado"),
    // Clientes cuyo primer pedido es en este periodo
    supabase.from("clientes").select("id").gte("created_at", desde).lte("created_at", hasta),
  ])

  const ventas = pedidos?.reduce((s, p) => s + neto(p.monto_neto, p.monto_total), 0) ?? 0
  const ventasUsd = pedidos?.reduce((s, p) => s + Number(p.monto_total_usd || 0), 0) ?? 0
  const ventasAnt = pedidosAnt?.reduce((s, p) => s + neto(p.monto_neto, p.monto_total), 0) ?? 0
  const totalPedidos = pedidos?.length ?? 0
  const totalPedidosAnt = pedidosAnt?.length ?? 0
  const clientesActivos = new Set(pedidos?.map((p) => p.cliente_id)).size

  // Distribution by tipo
  const tipoMap: Record<string, number> = { logo_ser: 0, marca_blanca: 0, personalizado: 0, sin_clasificar: 0 }
  pedidos?.forEach((p) => {
    const tipo = p.tipo || "sin_clasificar"
    if (tipo in tipoMap) tipoMap[tipo]++
    else tipoMap.sin_clasificar++
  })
  const distribucionTipo = [
    { name: "Logo SER", key: "logo_ser", value: tipoMap.logo_ser, color: "#378ADD" },
    { name: "Marca blanca", key: "marca_blanca", value: tipoMap.marca_blanca, color: "#9CA3AF" },
    { name: "Personalizado", key: "personalizado", value: tipoMap.personalizado, color: "#7F77DD" },
    { name: "Sin clasificar", key: "sin_clasificar", value: tipoMap.sin_clasificar, color: "#F59E0B" },
  ]

  // Distribution by canal
  const canalMap: Record<string, number> = {}
  const CANALES = ["tienda_nube", "whatsapp", "telefono", "presencial", "manual", "otro"]
  CANALES.forEach((c) => { canalMap[c] = 0 })
  pedidos?.forEach((p) => {
    const canal = p.canal || "otro"
    if (canal in canalMap) canalMap[canal]++
    else canalMap.otro++
  })
  const CANAL_LABELS: Record<string, string> = {
    tienda_nube: "Tienda Nube", whatsapp: "WhatsApp", telefono: "Teléfono",
    presencial: "Presencial", manual: "Manual", otro: "Otro",
  }
  const distribucionCanal = CANALES.map((c) => ({ name: CANAL_LABELS[c], key: c, value: canalMap[c] }))

  return {
    ventas, ventasUsd, ventasAnt, totalPedidos, totalPedidosAnt,
    ticketPromedio: totalPedidos > 0 ? ventas / totalPedidos : 0,
    clientesActivos, clientesNuevos: clientesNuevos?.length ?? 0,
    distribucionTipo, distribucionCanal,
  }
}

export async function getTopClientes(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("monto_total, monto_neto, cliente:clientes(id, nombre)")
    .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const map: Record<string, { nombre: string; facturado: number; pedidos: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?.forEach((p: any) => {
    const id = p.cliente?.id
    if (!id) return
    if (!map[id]) map[id] = { nombre: p.cliente.nombre, facturado: 0, pedidos: 0 }
    map[id].facturado += neto(p.monto_neto, p.monto_total)
    map[id].pedidos++
  })

  return Object.values(map)
    .map((c) => ({ ...c, ticketPromedio: c.pedidos > 0 ? c.facturado / c.pedidos : 0 }))
    .sort((a, b) => b.facturado - a.facturado).slice(0, 10)
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
    .select("monto_total, monto_neto, monto_total_usd, fecha_ingreso")
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
      mesesMap[key].facturacion += neto(p.monto_neto, p.monto_total)
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
  const hace5dias = new Date(Date.now() - 5 * 86400000).toISOString()

  const [{ data: pasosHoy }, { count: pasosPendientesCount }, { data: estancados }, { data: pedidosCerrados }] = await Promise.all([
    // Pasos completados hoy
    supabase.from("pedido_pasos").select("id")
      .eq("completado", true)
      .gte("completado_at", `${hoy}T00:00:00`),
    // Pasos pendientes (joined with active pedidos)
    supabase.from("pedido_pasos").select("id, pedido:pedidos!inner(estado_interno)", { count: "exact", head: true })
      .eq("completado", false)
      .not("pedido.estado_interno", "in", ESTADOS_INACTIVOS_FILTER),
    // Pedidos estancados (activos sin movimiento hace 5+ dias)
    supabase.from("pedidos").select("id")
      .not("estado_interno", "in", ESTADOS_INACTIVOS_FILTER)
      .lt("updated_at", hace5dias),
    // Pedidos entregados/despachados en periodo para calcular tiempo promedio
    supabase.from("pedidos").select("fecha_ingreso, updated_at")
      .in("estado_interno", ["entregado", "despachado"])
      .gte("updated_at", desde).lte("updated_at", hasta),
  ])

  let tiempoPromedioEntrega = 0
  if (pedidosCerrados && pedidosCerrados.length > 0) {
    const totalDias = pedidosCerrados.reduce((s, p) => {
      const ingreso = new Date(p.fecha_ingreso).getTime()
      const cierre = new Date(p.updated_at).getTime()
      return s + Math.max(0, (cierre - ingreso) / 86400000)
    }, 0)
    tiempoPromedioEntrega = Math.round(totalDias / pedidosCerrados.length)
  }

  return {
    pasosCompletadosHoy: pasosHoy?.length ?? 0,
    pasosPendientes: pasosPendientesCount ?? 0,
    pedidosEstancados: estancados?.length ?? 0,
    tiempoPromedioEntrega,
  }
}

export async function getPedidosEstancados(limite: number = 5) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("id, numero_tn, numero_interno, estado_interno, updated_at, responsable:usuarios(nombre)")
    .not("estado_interno", "in", ESTADOS_INACTIVOS_FILTER)
    .lt("updated_at", new Date(Date.now() - 5 * 86400000).toISOString())
    .order("updated_at", { ascending: true })
    .limit(limite)

  const hoy = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => {
    const dias = Math.floor((hoy.getTime() - new Date(p.updated_at).getTime()) / 86400000)
    return {
      id: p.id,
      numero: p.numero_tn || p.numero_interno || p.id.slice(0, 8),
      estado_interno: p.estado_interno,
      dias,
      responsable: p.responsable?.nombre || "Sin asignar",
    }
  })
}

export async function getRendimientoEquipo(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: pasos } = await supabase
    .from("pedido_pasos")
    .select("completado, asignado_a, usuario:usuarios!pedido_pasos_asignado_a_fkey(nombre)")
    .gte("created_at", desde).lte("created_at", hasta)

  const map: Record<string, { nombre: string; asignados: number; completados: number; pendientes: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pasos?.forEach((p: any) => {
    const key = p.usuario?.nombre || "Sin asignar"
    if (!map[key]) map[key] = { nombre: key, asignados: 0, completados: 0, pendientes: 0 }
    map[key].asignados++
    if (p.completado) map[key].completados++
    else map[key].pendientes++
  })

  return Object.values(map)
    .map((r) => ({ ...r, porcentaje: r.asignados > 0 ? Math.round((r.completados / r.asignados) * 100) : 0 }))
    .sort((a, b) => b.completados - a.completados)
}

// ============================================================
// RENTABILIDAD TAB
// ============================================================

export async function getRentabilidadPorPedido(desde: string, hasta: string) {
  const supabase = await createClient()

  const [{ data }, { data: comisionesData }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, numero_tn, numero_interno, monto_total, monto_neto, monto_total_usd, cliente:clientes(nombre), items:items_pedido(cantidad, costo_unitario)")
      .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
      .not("estado_interno", "eq", "cancelado")
      .order("monto_total", { ascending: false }).limit(50),
    supabase
      .from("comisiones_pedido")
      .select("pedido_id, total_comisiones"),
  ])

  // Build comisiones map by pedido_id
  const comisionesMap: Record<string, number> = {}
  comisionesData?.forEach((c) => {
    comisionesMap[c.pedido_id] = (comisionesMap[c.pedido_id] || 0) + Number(c.total_comisiones)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const costo = p.items?.reduce((s: number, i: any) => s + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0
    const monto = neto(p.monto_neto, p.monto_total)
    const comisiones = comisionesMap[p.id] || 0
    const margen = monto - costo
    const margenReal = monto - costo - comisiones
    return {
      id: p.id,
      numero: p.numero_tn || p.numero_interno || p.id.slice(0, 8),
      cliente: p.cliente?.nombre || "\u2014",
      monto, costo, comisiones, margen,
      margen_pct: monto > 0 ? (margen / monto) * 100 : 0,
      margen_real: margenReal,
      margen_real_pct: monto > 0 ? (margenReal / monto) * 100 : 0,
      usd: Number(p.monto_total_usd || 0),
    }
  })
}

export async function getRentabilidadPorCliente(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("monto_total, monto_neto, cliente:clientes(id, nombre, categoria), items:items_pedido(cantidad, costo_unitario)")
    .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const map: Record<string, { id: string; nombre: string; categoria: string; facturado: number; costo: number; pedidos: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?.forEach((p: any) => {
    const cId = p.cliente?.id
    if (!cId) return
    if (!map[cId]) map[cId] = { id: cId, nombre: p.cliente.nombre, categoria: p.cliente.categoria, facturado: 0, costo: 0, pedidos: 0 }
    map[cId].facturado += neto(p.monto_neto, p.monto_total)
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

  const desdeDate = desde.split("T")[0]
  const hastaDate = hasta.split("T")[0]

  const [{ data: pedidos }, { data: gastosData }, { data: pagosProveedor }, { data: comisionesData }] = await Promise.all([
    supabase.from("pedidos")
      .select("monto_total, monto_neto, items:items_pedido(cantidad, costo_unitario)")
      .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
      .not("estado_interno", "eq", "cancelado"),
    supabase.from("gastos")
      .select("monto, cuenta:cuentas(nombre)")
      .gte("fecha", desdeDate).lte("fecha", hastaDate),
    supabase.from("pagos")
      .select("monto")
      .eq("tipo", "pago_proveedor")
      .gte("fecha", desdeDate).lte("fecha", hastaDate),
    supabase.from("comisiones_pedido")
      .select("comision_pasarela_neta, comision_tn, created_at")
      .gte("created_at", desde).lte("created_at", hasta),
  ])

  const ventasBrutas = pedidos?.reduce((s, p) => s + neto(p.monto_neto, p.monto_total), 0) ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmv = pedidos?.reduce((s, p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return s + (p.items?.reduce((si: number, i: any) => si + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0)
  }, 0) ?? 0

  // Desglose de gastos por categoria (cuenta contable)
  const gastosMap: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gastosData?.forEach((g: any) => {
    const cat = g.cuenta?.nombre || "Otros"
    gastosMap[cat] = (gastosMap[cat] || 0) + Number(g.monto)
  })
  const gastosDesglose = Object.entries(gastosMap)
    .map(([categoria, monto]) => ({ categoria, monto }))
    .sort((a, b) => b.monto - a.monto)

  const totalGastos = gastosData?.reduce((s, g) => s + Number(g.monto), 0) ?? 0
  const totalPagosProveedor = pagosProveedor?.reduce((s, p) => s + Number(p.monto), 0) ?? 0

  // Comisiones de pasarela (neto, sin IVA — el IVA es CF, no gasto)
  const comisionesPasarela = comisionesData?.reduce((s, c) =>
    s + Number(c.comision_pasarela_neta) + Number(c.comision_tn), 0) ?? 0

  const margenBruto = ventasBrutas - cmv
  const gastosOperativos = totalGastos + totalPagosProveedor
  const resultado = margenBruto - comisionesPasarela - gastosOperativos

  return {
    ventasBrutas, cmv, margenBruto,
    margenBrutoPct: ventasBrutas > 0 ? (margenBruto / ventasBrutas) * 100 : 0,
    comisionesPasarela,
    comisionesPasarelaPct: ventasBrutas > 0 ? (comisionesPasarela / ventasBrutas) * 100 : 0,
    gastosOperativos,
    gastosDesglose,
    resultado,
    resultadoPct: ventasBrutas > 0 ? (resultado / ventasBrutas) * 100 : 0,
  }
}

// ============================================================
// STOCK TAB
// ============================================================

export async function getMetricasStock() {
  const supabase = await createClient()

  const [{ data: insumos }, { data: comprasPendientes }, { data: comprasDeuda }, { data: ultimasComprasInsumos }] = await Promise.all([
    supabase.from("insumos").select("id, nombre, stock_actual, stock_minimo, costo_unitario, unidad")
      .eq("tipo", "material").eq("activo", true),
    supabase.from("compras").select("id, numero_orden, proveedor:proveedores(nombre), fecha_esperada, estado, subtotal, descuento")
      .in("estado", ["enviada", "confirmada", "recibida_parcial"]),
    // Compras con saldo pendiente de pago
    supabase.from("compras").select("id, subtotal, descuento, estado_pago")
      .in("estado_pago", ["pendiente", "parcial"])
      .not("estado", "eq", "cancelada"),
    // Ultima compra por insumo (para mostrar en stock critico)
    supabase.from("items_compra").select("insumo_id, compra:compras(fecha_pedido)")
      .not("insumo_id", "is", null)
      .order("created_at", { ascending: false }),
  ])

  const stockCritico = insumos?.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0) ?? []

  // Map ultima compra por insumo
  const ultimaCompraMap: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ultimasComprasInsumos?.forEach((ic: any) => {
    if (ic.insumo_id && !ultimaCompraMap[ic.insumo_id] && ic.compra?.fecha_pedido) {
      ultimaCompraMap[ic.insumo_id] = ic.compra.fecha_pedido
    }
  })

  const stockCriticoConFecha = stockCritico.map((i) => ({
    ...i,
    diferencia: Number(i.stock_actual) - Number(i.stock_minimo),
    ultima_compra: ultimaCompraMap[i.id] || null,
  }))

  const valorInventario = insumos?.reduce((s, i) => s + (Number(i.stock_actual) * Number(i.costo_unitario)), 0) ?? 0

  // Deuda con proveedores
  const deudaProveedores = comprasDeuda?.reduce((s, c) => s + (Number(c.subtotal) - Number(c.descuento || 0)), 0) ?? 0

  const hoy = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compras = (comprasPendientes || []).map((c: any) => {
    const esperada = c.fecha_esperada ? new Date(c.fecha_esperada) : null
    return {
      id: c.id, numero_orden: c.numero_orden, proveedor: c.proveedor?.nombre || "\u2014", estado: c.estado,
      fecha_esperada: c.fecha_esperada,
      monto: Number(c.subtotal) - Number(c.descuento || 0),
      dias_atraso: esperada ? Math.max(0, Math.floor((hoy.getTime() - esperada.getTime()) / 86400000)) : 0,
    }
  })

  const comprasMontoTotal = compras.reduce((s, c) => s + c.monto, 0)

  return {
    stockCritico: stockCriticoConFecha,
    valorInventario,
    comprasPendientes: compras,
    comprasMontoTotal,
    deudaProveedores,
  }
}

// ============================================================
// FINANCIERO TAB
// ============================================================

export async function getMetricasFinancieras(desde: string, hasta: string) {
  const supabase = await createClient()

  const desdeDate = desde.split("T")[0]
  const hastaDate = hasta.split("T")[0]

  const [{ data: pedidosDeuda }, { data: cobros }, { data: pagosProveedorData }, { data: gastosData }, { data: cobrosAnteriorData }, { data: comisionesData }] = await Promise.all([
    supabase.from("pedidos").select("id, saldo_pendiente, created_at")
      .gt("saldo_pendiente", 0).not("estado_interno", "in", '("cerrado","cancelado")'),
    supabase.from("pagos").select("monto").eq("tipo", "cobro")
      .gte("fecha", desdeDate).lte("fecha", hastaDate),
    // Pagos a proveedores en periodo
    supabase.from("pagos_proveedor").select("monto")
      .gte("fecha", desdeDate).lte("fecha", hastaDate),
    // Gastos pagados en periodo
    supabase.from("gastos").select("monto")
      .eq("pagado", true)
      .gte("fecha", desdeDate).lte("fecha", hastaDate),
    // Cobros del periodo anterior (para tendencia)
    (() => {
      const desdeDt = new Date(desde)
      const hastaDt = new Date(hasta)
      const diff = hastaDt.getTime() - desdeDt.getTime()
      const desdeAnt = new Date(desdeDt.getTime() - diff).toISOString().split("T")[0]
      return supabase.from("pagos").select("monto").eq("tipo", "cobro")
        .gte("fecha", desdeAnt).lt("fecha", desdeDate)
    })(),
    // Comisiones del periodo
    supabase.from("comisiones_pedido").select("total_comisiones")
      .gte("created_at", desde).lte("created_at", hasta),
  ])

  const totalACobrar = pedidosDeuda?.reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0
  const pedidosConSaldo = pedidosDeuda?.length ?? 0
  const totalCobros = cobros?.reduce((s, p) => s + Number(p.monto), 0) ?? 0
  const cobrosAnterior = cobrosAnteriorData?.reduce((s, p) => s + Number(p.monto), 0) ?? 0
  const totalEgresosProv = pagosProveedorData?.reduce((s, p) => s + Number(p.monto), 0) ?? 0
  const totalEgresosGastos = gastosData?.reduce((s, g) => s + Number(g.monto), 0) ?? 0
  const totalEgresos = totalEgresosProv + totalEgresosGastos
  const flujoCaja = totalCobros - totalEgresos

  // Antiguedad de cuentas a cobrar
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

  const totalComisiones = comisionesData?.reduce((s, c) => s + Number(c.total_comisiones), 0) ?? 0

  return {
    totalACobrar, pedidosConSaldo, totalCobros, cobrosAnterior, totalEgresos, flujoCaja,
    totalComisiones,
    antiguedad: Object.entries(franjas).map(([franja, monto]) => ({
      franja, monto, porcentaje: totalACobrar > 0 ? (monto / totalACobrar) * 100 : 0,
    })),
  }
}

export async function getPosicionIVA(desde: string, hasta: string) {
  const supabase = await createClient()

  const desdeDate = desde.split("T")[0]
  const hastaDate = hasta.split("T")[0]

  const [{ data: pedidos }, { data: compras }, { data: gastos }, { data: comisionesIva }] = await Promise.all([
    // IVA debito: de ventas (pedidos) en el periodo
    supabase.from("pedidos").select("monto_total, monto_iva")
      .gte("fecha_ingreso", desde).lte("fecha_ingreso", hasta)
      .not("estado_interno", "eq", "cancelado"),
    // IVA credito de compras
    supabase.from("compras").select("subtotal, descuento")
      .gte("fecha_pedido", desdeDate).lte("fecha_pedido", hastaDate)
      .not("estado", "eq", "cancelada"),
    // IVA credito de gastos (only those accounts that include IVA per CATEGORIA_IVA_DEFAULT)
    supabase.from("gastos").select("monto, cuenta:cuentas(codigo)")
      .gte("fecha", desdeDate).lte("fecha", hastaDate),
    // IVA credito de comisiones de pasarela
    supabase.from("comisiones_pedido").select("iva_comision_pasarela")
      .gte("created_at", desde).lte("created_at", hasta),
  ])

  // IVA debito from pedidos
  const ivaDebito = pedidos?.reduce((s, p) => {
    if (p.monto_iva && Number(p.monto_iva) > 0) return s + Number(p.monto_iva)
    return s + calcularIVA(Number(p.monto_total))
  }, 0) ?? 0

  // IVA credito from compras (compras subtotals are neto, IVA at 21%)
  const ivaCreditoCompras = compras?.reduce((s, c) => {
    const montoNeto = Number(c.subtotal) - Number(c.descuento || 0)
    return s + (montoNeto * 0.21)
  }, 0) ?? 0

  // IVA credito from gastos (only those with incluye_iva per account code)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ivaCreditoGastos = gastos?.reduce((s, g: any) => {
    const codigo = g.cuenta?.codigo
    const incluyeIva = codigo ? (CATEGORIA_IVA_DEFAULT[codigo] ?? false) : false
    if (!incluyeIva) return s
    return s + calcularIVA(Number(g.monto))
  }, 0) ?? 0

  // IVA credito from comisiones de pasarela
  const ivaCreditoComisiones = comisionesIva?.reduce((s, c) => s + Number(c.iva_comision_pasarela), 0) ?? 0

  const saldoAPagar = ivaDebito - ivaCreditoCompras - ivaCreditoGastos - ivaCreditoComisiones

  return {
    ivaDebito,
    ivaCreditoCompras,
    ivaCreditoGastos,
    ivaCreditoComisiones,
    ivaCreditoTotal: ivaCreditoCompras + ivaCreditoGastos + ivaCreditoComisiones,
    saldoAPagar,
  }
}

export async function getGastosPorCategoria(desde: string, hasta: string) {
  const supabase = await createClient()

  const desdeDate = desde.split("T")[0]
  const hastaDate = hasta.split("T")[0]

  const { data: gastos } = await supabase
    .from("gastos")
    .select("monto, cuenta:cuentas(codigo, nombre)")
    .gte("fecha", desdeDate).lte("fecha", hastaDate)

  const map: Record<string, number> = {}
  let totalGastos = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gastos?.forEach((g: any) => {
    const cat = g.cuenta?.nombre || "Otros"
    const codigo = g.cuenta?.codigo
    // Use monto_neto when account includes IVA, otherwise monto as-is
    const incluyeIva = codigo ? (CATEGORIA_IVA_DEFAULT[codigo] ?? false) : false
    const montoNeto = incluyeIva ? calcularNeto(Number(g.monto)) : Number(g.monto)
    map[cat] = (map[cat] || 0) + montoNeto
    totalGastos += montoNeto
  })

  return Object.entries(map)
    .map(([categoria, monto]) => ({
      categoria,
      monto,
      porcentaje: totalGastos > 0 ? (monto / totalGastos) * 100 : 0,
    }))
    .sort((a, b) => b.monto - a.monto)
}
