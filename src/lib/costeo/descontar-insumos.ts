"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface InsumoNecesario {
  insumo_id: string
  nombre: string
  unidad: string
  necesario: number
  stock_actual: number
  resultado: number
  suficiente: boolean
}

interface InsumosNecesariosResult {
  items: InsumoNecesario[]
}

export async function calcularInsumosNecesarios(
  pedidoId: string,
): Promise<InsumosNecesariosResult> {
  const supabase = await createClient()

  // Get items_pedido
  const { data: itemsPedido, error: itemsError } = await supabase
    .from("items_pedido")
    .select("id, producto_id, cantidad")
    .eq("pedido_id", pedidoId)

  if (itemsError || !itemsPedido) {
    return { items: [] }
  }

  // Accumulate insumo requirements: insumo_id -> total needed
  const acumulado = new Map<string, { nombre: string; unidad: string; necesario: number }>()

  for (const item of itemsPedido) {
    if (!item.producto_id) continue

    // Get active recipe for this product
    const { data: receta } = await supabase
      .from("recetas")
      .select(`
        id,
        items:receta_insumos(
          insumo_id, cantidad,
          insumo:insumos(id, nombre, tipo, unidad)
        )
      `)
      .eq("producto_id", item.producto_id)
      .eq("activa", true)
      .single()

    if (!receta?.items) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const ri of receta.items as any[]) {
      const insumo = ri.insumo
      if (!insumo) continue
      // Skip servicios
      if (insumo.tipo === "servicio") continue

      const necesario = Number(ri.cantidad) * Number(item.cantidad)
      const existing = acumulado.get(insumo.id)

      if (existing) {
        existing.necesario += necesario
      } else {
        acumulado.set(insumo.id, {
          nombre: insumo.nombre,
          unidad: insumo.unidad,
          necesario,
        })
      }
    }
  }

  // For each material insumo, get current stock
  const items: InsumoNecesario[] = []

  for (const [insumoId, data] of acumulado) {
    const { data: insumo } = await supabase
      .from("insumos")
      .select("stock_actual")
      .eq("id", insumoId)
      .single()

    const stockActual = Number(insumo?.stock_actual || 0)
    const resultado = stockActual - data.necesario

    items.push({
      insumo_id: insumoId,
      nombre: data.nombre,
      unidad: data.unidad,
      necesario: Math.round(data.necesario * 100) / 100,
      stock_actual: stockActual,
      resultado: Math.round(resultado * 100) / 100,
      suficiente: resultado >= 0,
    })
  }

  return { items }
}

export async function descontarInsumosPedido(
  pedidoId: string,
  forzar: boolean,
): Promise<{ descontados: number; errores: string[] }> {
  const supabase = await createClient()
  const { items } = await calcularInsumosNecesarios(pedidoId)

  let descontados = 0
  const errores: string[] = []

  for (const item of items) {
    if (item.necesario <= 0) continue
    if (!item.suficiente && !forzar) {
      errores.push(`${item.nombre}: stock insuficiente (necesario: ${item.necesario}, disponible: ${item.stock_actual})`)
      continue
    }

    const { error } = await supabase.rpc("registrar_movimiento_stock", {
      p_insumo_id: item.insumo_id,
      p_tipo: "salida",
      p_cantidad: item.necesario,
      p_referencia_tipo: "pedido",
      p_referencia_id: pedidoId,
      p_notas: `Descuento por pedido ${pedidoId.slice(0, 8)}`,
      p_usuario_id: null,
    })

    if (error) {
      errores.push(`${item.nombre}: ${error.message}`)
    } else {
      descontados++
    }
  }

  revalidatePath("/insumos")
  revalidatePath(`/pedidos/${pedidoId}`)

  return { descontados, errores }
}
