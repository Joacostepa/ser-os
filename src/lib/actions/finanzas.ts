"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { onGastoRegistrado, onGastoPagado } from "@/lib/contable/hooks-contables"
import { calcularNeto } from "@/lib/iva"

// ============================================================
// DASHBOARD
// ============================================================

export async function getDashboardFinanciero(desde: string, hasta: string) {
  const supabase = await createClient()

  // Cuentas a cobrar: pedidos con saldo > 0
  const { data: cxc } = await supabase
    .from("pedidos")
    .select("id, numero_tn, saldo_pendiente, created_at, cliente:clientes(nombre)")
    .gt("saldo_pendiente", 0)
    .not("estado_interno", "in", '("cancelado")')
    .order("created_at", { ascending: true })

  const totalACobrar = cxc?.reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0

  // Cuentas a pagar: compras pendientes + gastos pendientes
  const { data: comprasPend } = await supabase
    .from("compras")
    .select("id, proveedor:proveedores(nombre)")
    .in("estado", ["enviada", "confirmada", "recibida_parcial", "recibida"])

  const { data: gastosPend } = await supabase
    .from("gastos")
    .select("monto")
    .eq("pagado", false)

  const totalAPagar = (gastosPend?.reduce((s, g) => s + Number(g.monto), 0) ?? 0)

  // Cobros del período
  const { data: cobros } = await supabase
    .from("pagos")
    .select("monto")
    .eq("tipo", "cobro")
    .gte("fecha", desde.split("T")[0])
    .lte("fecha", hasta.split("T")[0])

  const totalCobros = cobros?.reduce((s, p) => s + Number(p.monto), 0) ?? 0

  // Egresos del período
  const { data: egresos } = await supabase
    .from("pagos")
    .select("monto")
    .in("tipo", ["pago_proveedor", "gasto"])
    .gte("fecha", desde.split("T")[0])
    .lte("fecha", hasta.split("T")[0])

  const { data: gastosDelPeriodo } = await supabase
    .from("gastos")
    .select("monto")
    .eq("pagado", true)
    .gte("fecha", desde.split("T")[0])
    .lte("fecha", hasta.split("T")[0])

  const totalEgresos = (egresos?.reduce((s, p) => s + Number(p.monto), 0) ?? 0) +
    (gastosDelPeriodo?.reduce((s, g) => s + Number(g.monto), 0) ?? 0)

  const flujoCaja = totalCobros - totalEgresos

  // Ventas del período
  const { data: ventas } = await supabase
    .from("pedidos")
    .select("monto_total, monto_neto, items:items_pedido(cantidad, costo_unitario)")
    .gte("fecha_ingreso", desde)
    .lte("fecha_ingreso", hasta)
    .not("estado_interno", "eq", "cancelado")

  const ventasNetas = ventas?.reduce((s, p) => s + (Number(p.monto_neto || 0) || calcularNeto(Number(p.monto_total))), 0) ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmv = ventas?.reduce((s, p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return s + (p.items?.reduce((si: number, i: any) => si + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0)
  }, 0) ?? 0

  const margenBruto = ventasNetas - cmv
  const resultado = margenBruto - totalEgresos

  return {
    totalACobrar,
    totalAPagar,
    flujoCaja,
    resultado,
    ventasNetas,
    cmv,
    margenBruto,
    margenPct: ventasNetas > 0 ? (margenBruto / ventasNetas) * 100 : 0,
    resultadoPct: ventasNetas > 0 ? (resultado / ventasNetas) * 100 : 0,
    gastosOperativos: totalEgresos,
    topCobros: (cxc || []).slice(0, 5).map((p) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: p.id, numero_tn: p.numero_tn, cliente: (p as any).cliente?.nombre || "—",
      saldo: Number(p.saldo_pendiente),
      dias: Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000),
    })),
    comprasPendientes: comprasPend?.length ?? 0,
  }
}

// ============================================================
// CUENTAS A COBRAR
// ============================================================

export async function getCuentasACobrar(filtros?: { antiguedad?: string }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("pedidos")
    .select("id, numero_tn, monto_total, monto_pagado, saldo_pendiente, created_at, fecha_ingreso, cliente:clientes(id, nombre)")
    .gt("saldo_pendiente", 0)
    .not("estado_interno", "eq", "cancelado")
    .order("created_at", { ascending: true })

  const hoy = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data || []).map((p: any) => {
    const dias = Math.floor((hoy.getTime() - new Date(p.created_at).getTime()) / 86400000)
    let franja = "0-15"
    if (dias > 60) franja = "60+"
    else if (dias > 30) franja = "31-60"
    else if (dias > 15) franja = "16-30"

    return {
      id: p.id, numero_tn: p.numero_tn,
      fecha: p.fecha_ingreso || p.created_at,
      cliente_id: p.cliente?.id, cliente: p.cliente?.nombre || "—",
      total: Number(p.monto_total), cobrado: Number(p.monto_pagado),
      saldo: Number(p.saldo_pendiente), dias, franja,
    }
  })

  if (filtros?.antiguedad && filtros.antiguedad !== "todas") {
    return result.filter((r) => r.franja === filtros.antiguedad)
  }

  return result
}

// ============================================================
// CUENTAS A PAGAR
// ============================================================

export async function getCuentasAPagar() {
  const supabase = await createClient()

  // Compras pendientes
  const { data: compras } = await supabase
    .from("compras")
    .select("id, estado, fecha_esperada, proveedor:proveedores(nombre), items:items_compra(cantidad, precio_unitario)")
    .in("estado", ["enviada", "confirmada", "recibida_parcial", "recibida"])

  // Gastos pendientes
  const { data: gastos } = await supabase
    .from("gastos")
    .select("id, descripcion, monto, fecha, cuenta:cuentas(nombre)")
    .eq("pagado", false)
    .order("fecha", { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comprasResult = (compras || []).map((c: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = c.items?.reduce((s: number, i: any) => s + (Number(i.cantidad) * Number(i.precio_unitario)), 0) ?? 0
    return {
      id: c.id, tipo: "compra" as const,
      proveedor: c.proveedor?.nombre || "—",
      total, fecha_esperada: c.fecha_esperada, estado: c.estado,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gastosResult = (gastos || []).map((g: any) => ({
    id: g.id, tipo: "gasto" as const,
    descripcion: g.descripcion,
    categoria: g.cuenta?.nombre || "—",
    monto: Number(g.monto), fecha: g.fecha,
  }))

  return { compras: comprasResult, gastos: gastosResult }
}

// ============================================================
// GASTOS CRUD
// ============================================================

export async function getGastos(filtros?: { categoria?: string; pagado?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from("gastos")
    .select("*, cuenta:cuentas(id, codigo, nombre)")
    .order("fecha", { ascending: false })

  if (filtros?.pagado === "pagado") query = query.eq("pagado", true)
  if (filtros?.pagado === "pendiente") query = query.eq("pagado", false)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function crearGasto(data: {
  descripcion: string
  cuenta_id: number
  cuenta_codigo: string
  monto: number
  fecha: string
  pagado: boolean
  metodo_pago?: string
  recurrente?: boolean
  frecuencia?: string
  observaciones?: string
}) {
  const supabase = await createClient()

  const { data: gasto, error } = await supabase
    .from("gastos")
    .insert({
      descripcion: data.descripcion,
      cuenta_id: data.cuenta_id,
      monto: data.monto,
      fecha: data.fecha,
      pagado: data.pagado,
      metodo_pago: data.pagado ? data.metodo_pago || null : null,
      fecha_pago: data.pagado ? data.fecha : null,
      recurrente: data.recurrente || false,
      frecuencia: data.frecuencia || null,
      observaciones: data.observaciones || null,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  // Generate accounting entry
  try {
    await onGastoRegistrado({
      id: gasto.id,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: data.fecha,
      pagado: data.pagado,
      cuenta_codigo: data.cuenta_codigo,
    })
  } catch (err) {
    console.error("Error generando asiento para gasto:", err)
  }

  revalidatePath("/finanzas/gastos")
  revalidatePath("/finanzas")
  return gasto
}

export async function marcarGastoPagado(gastoId: string, metodoPago: string) {
  const supabase = await createClient()

  const { data: gasto } = await supabase
    .from("gastos")
    .select("*, cuenta:cuentas(codigo)")
    .eq("id", gastoId)
    .single()

  if (!gasto) throw new Error("Gasto no encontrado")

  await supabase
    .from("gastos")
    .update({
      pagado: true,
      fecha_pago: new Date().toISOString().split("T")[0],
      metodo_pago: metodoPago,
    })
    .eq("id", gastoId)

  // Generate payment accounting entry
  try {
    await onGastoPagado({
      id: gastoId,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
    })
  } catch (err) {
    console.error("Error generando asiento de pago de gasto:", err)
  }

  revalidatePath("/finanzas/gastos")
  revalidatePath("/finanzas")
}

export async function getCategoriaGastos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("cuentas")
    .select("id, codigo, nombre")
    .eq("tipo", "gasto")
    .eq("nivel", 3)
    .eq("activa", true)
    .order("codigo")

  return data || []
}

// ============================================================
// ESTADO DE RESULTADOS
// ============================================================

export async function getEstadoResultados(desde: string, hasta: string) {
  const supabase = await createClient()

  const { data: movimientos } = await supabase
    .from("movimientos_contables")
    .select("debe, haber, cuenta:cuentas(id, codigo, nombre, tipo, naturaleza), asiento:asientos!inner(fecha, anulado)")
    .eq("asiento.anulado", false)
    .gte("asiento.fecha", desde.split("T")[0])
    .lte("asiento.fecha", hasta.split("T")[0])

  // Group by cuenta
  const cuentasSaldos: Record<string, { codigo: string; nombre: string; tipo: string; naturaleza: string; saldo: number }> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movimientos?.forEach((m: any) => {
    const codigo = m.cuenta?.codigo
    if (!codigo) return
    const tipo = m.cuenta.tipo
    if (!["ingreso", "costo", "gasto"].includes(tipo)) return

    if (!cuentasSaldos[codigo]) {
      cuentasSaldos[codigo] = { codigo, nombre: m.cuenta.nombre, tipo, naturaleza: m.cuenta.naturaleza, saldo: 0 }
    }

    if (m.cuenta.naturaleza === "deudora") {
      cuentasSaldos[codigo].saldo += Number(m.debe) - Number(m.haber)
    } else {
      cuentasSaldos[codigo].saldo += Number(m.haber) - Number(m.debe)
    }
  })

  // Build P&L structure
  const ingresos = Object.values(cuentasSaldos).filter((c) => c.tipo === "ingreso")
  const costos = Object.values(cuentasSaldos).filter((c) => c.tipo === "costo")
  const gastos = Object.values(cuentasSaldos).filter((c) => c.tipo === "gasto")

  const totalIngresos = ingresos.reduce((s, c) => s + c.saldo, 0)
  const totalCostos = costos.reduce((s, c) => s + c.saldo, 0)
  const totalGastos = gastos.reduce((s, c) => s + c.saldo, 0)
  const margenBruto = totalIngresos - totalCostos
  const resultado = margenBruto - totalGastos

  return {
    ingresos: ingresos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
    costos: costos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
    gastos: gastos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
    totalIngresos, totalCostos, totalGastos,
    margenBruto,
    margenPct: totalIngresos > 0 ? (margenBruto / totalIngresos) * 100 : 0,
    resultado,
    resultadoPct: totalIngresos > 0 ? (resultado / totalIngresos) * 100 : 0,
  }
}

// ============================================================
// FLUJO DE CAJA
// ============================================================

export async function getFlujoCaja(desde: string, hasta: string) {
  const supabase = await createClient()

  // Get all movements on Caja account (1.1.1)
  const { data: movimientos } = await supabase
    .from("movimientos_contables")
    .select("debe, haber, asiento:asientos!inner(fecha, anulado, tipo)")
    .eq("asiento.anulado", false)
    .gte("asiento.fecha", desde.split("T")[0])
    .lte("asiento.fecha", hasta.split("T")[0])

  // Filter to Caja account — need to join with cuentas
  const { data: movCaja } = await supabase
    .from("movimientos_contables")
    .select("debe, haber, asiento:asientos!inner(fecha, anulado, tipo, descripcion), cuenta:cuentas!inner(codigo)")
    .eq("cuenta.codigo", "1.1.1")
    .eq("asiento.anulado", false)
    .gte("asiento.fecha", desde.split("T")[0])
    .lte("asiento.fecha", hasta.split("T")[0])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ingresos = (movCaja || []).reduce((s: number, m: any) => s + Number(m.debe), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const egresos = (movCaja || []).reduce((s: number, m: any) => s + Number(m.haber), 0)

  // Group by month
  const mesesMap: Record<string, { mes: string; ingresos: number; egresos: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movCaja?.forEach((m: any) => {
    const fecha = new Date(m.asiento.fecha)
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
    if (!mesesMap[key]) mesesMap[key] = { mes: key, ingresos: 0, egresos: 0 }
    mesesMap[key].ingresos += Number(m.debe)
    mesesMap[key].egresos += Number(m.haber)
  })

  return {
    ingresos, egresos,
    flujoNeto: ingresos - egresos,
    mensual: Object.values(mesesMap).sort((a, b) => a.mes.localeCompare(b.mes)),
  }
}

// ============================================================
// LIBRO DIARIO
// ============================================================

export async function getLibroDiario(filtros?: { tipo?: string; desde?: string; hasta?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from("asientos")
    .select("*, movimientos:movimientos_contables(*, cuenta:cuentas(codigo, nombre))")
    .order("fecha", { ascending: false })
    .limit(100)

  if (filtros?.tipo && filtros.tipo !== "todos") {
    query = query.eq("tipo", filtros.tipo)
  }
  if (filtros?.desde) query = query.gte("fecha", filtros.desde)
  if (filtros?.hasta) query = query.lte("fecha", filtros.hasta)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// ============================================================
// PLAN DE CUENTAS
// ============================================================

export async function getPlanCuentas() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("cuentas")
    .select("*")
    .order("codigo")

  return data || []
}

export async function agregarCuenta(data: {
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  cuenta_padre_id: number
  nivel: number
  descripcion?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase.from("cuentas").insert(data)
  if (error) throw new Error(error.message)
  revalidatePath("/finanzas/plan-de-cuentas")
}

export async function toggleCuentaActiva(cuentaId: number, activa: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("cuentas")
    .update({ activa })
    .eq("id", cuentaId)

  if (error) throw new Error(error.message)
  revalidatePath("/finanzas/plan-de-cuentas")
}
