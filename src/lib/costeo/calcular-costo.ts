"use server"

import { createClient } from "@/lib/supabase/server"

interface DesgloseItem {
  insumo_id: string
  insumo_nombre: string
  tipo: string
  cantidad: number
  unidad: string
  costo_unitario: number
  subtotal: number
}

interface CosteoProductoResult {
  costo_total: number
  desglose: DesgloseItem[]
  receta_completa: boolean
  fuente: "receta" | "costo_base" | "sin_definir"
}

interface CosteoItemPedido {
  item_pedido_id: string
  producto_nombre: string
  cantidad: number
  costo_unitario: number
  costo_linea: number
  receta_completa: boolean
}

interface CosteoPedidoResult {
  costo_total: number
  items: CosteoItemPedido[]
  pedido_costeo_completo: boolean
  alertas: string[]
}

export async function calcularCostoUnitarioProducto(
  productoId: string,
): Promise<CosteoProductoResult> {
  const supabase = await createClient()

  const { data: receta, error } = await supabase
    .from("recetas")
    .select(`
      id,
      items:receta_insumos(
        id, cantidad, costo_override,
        insumo:insumos(id, nombre, tipo, unidad, costo_unitario)
      )
    `)
    .eq("producto_id", productoId)
    .eq("activa", true)
    .single()

  if (error || !receta) {
    // No recipe — fall back to producto.costo_base
    const { data: producto } = await supabase
      .from("productos")
      .select("costo_base")
      .eq("id", productoId)
      .single()

    const costoBase = Number(producto?.costo_base || 0)
    if (costoBase > 0) {
      return { costo_total: costoBase, desglose: [], receta_completa: true, fuente: "costo_base" }
    }
    return { costo_total: 0, desglose: [], receta_completa: false, fuente: "sin_definir" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (receta.items || []) as any[]

  if (items.length === 0) {
    // Recipe exists but has no items — fall back to costo_base
    const { data: producto } = await supabase
      .from("productos")
      .select("costo_base")
      .eq("id", productoId)
      .single()

    const costoBase = Number(producto?.costo_base || 0)
    if (costoBase > 0) {
      return { costo_total: costoBase, desglose: [], receta_completa: true, fuente: "costo_base" }
    }
    return { costo_total: 0, desglose: [], receta_completa: false, fuente: "sin_definir" }
  }

  let costoTotal = 0
  let recetaCompleta = true
  const desglose: DesgloseItem[] = []

  for (const item of items) {
    const insumo = item.insumo
    if (!insumo) continue

    const cantidad = Number(item.cantidad)
    const costoUnitario = Number(item.costo_override ?? insumo.costo_unitario ?? 0)
    const subtotal = cantidad * costoUnitario

    if (costoUnitario === 0) {
      recetaCompleta = false
    }

    costoTotal += subtotal
    desglose.push({
      insumo_id: insumo.id,
      insumo_nombre: insumo.nombre,
      tipo: insumo.tipo,
      cantidad,
      unidad: insumo.unidad,
      costo_unitario: costoUnitario,
      subtotal,
    })
  }

  return {
    costo_total: Math.round(costoTotal * 100) / 100,
    desglose,
    receta_completa: recetaCompleta,
    fuente: "receta" as const,
  }
}

export async function calcularCostoPedido(
  pedidoId: string,
): Promise<CosteoPedidoResult> {
  const supabase = await createClient()

  const { data: itemsPedido, error } = await supabase
    .from("items_pedido")
    .select("id, producto_id, descripcion, cantidad")
    .eq("pedido_id", pedidoId)

  if (error || !itemsPedido) {
    return { costo_total: 0, items: [], pedido_costeo_completo: false, alertas: ["No se encontraron items del pedido"] }
  }

  let costoTotal = 0
  const items: CosteoItemPedido[] = []
  const alertas: string[] = []
  let todoCompleto = true

  for (const item of itemsPedido) {
    if (!item.producto_id) {
      items.push({
        item_pedido_id: item.id,
        producto_nombre: item.descripcion,
        cantidad: Number(item.cantidad),
        costo_unitario: 0,
        costo_linea: 0,
        receta_completa: false,
      })
      alertas.push(`"${item.descripcion}" no tiene producto asociado`)
      todoCompleto = false
      continue
    }

    const costeo = await calcularCostoUnitarioProducto(item.producto_id)
    const costoLinea = costeo.costo_total * Number(item.cantidad)

    if (!costeo.receta_completa) {
      todoCompleto = false
      if (costeo.desglose.length === 0) {
        alertas.push(`"${item.descripcion}" no tiene receta`)
      } else {
        alertas.push(`"${item.descripcion}" tiene insumos sin costo`)
      }
    }

    costoTotal += costoLinea
    items.push({
      item_pedido_id: item.id,
      producto_nombre: item.descripcion,
      cantidad: Number(item.cantidad),
      costo_unitario: costeo.costo_total,
      costo_linea: Math.round(costoLinea * 100) / 100,
      receta_completa: costeo.receta_completa,
    })
  }

  return {
    costo_total: Math.round(costoTotal * 100) / 100,
    items,
    pedido_costeo_completo: todoCompleto,
    alertas,
  }
}
