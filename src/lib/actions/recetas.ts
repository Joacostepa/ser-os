"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getRecetaByProducto(productoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recetas")
    .select(`
      *,
      items:receta_insumos(
        id, cantidad, notas,
        insumo:insumos(id, nombre, tipo, unidad, costo_unitario)
      )
    `)
    .eq("producto_id", productoId)
    .eq("activa", true)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any | null
}

export async function crearReceta(data: {
  producto_id: string
  nombre: string
  notas?: string
  items: {
    insumo_id: string
    cantidad: number
    notas?: string
  }[]
}) {
  const supabase = await createClient()

  // Deactivate existing active recipe
  await supabase
    .from("recetas")
    .update({ activa: false })
    .eq("producto_id", data.producto_id)
    .eq("activa", true)

  // Create new recipe
  const { data: receta, error: recetaError } = await supabase
    .from("recetas")
    .insert({
      producto_id: data.producto_id,
      nombre: data.nombre,
      activa: true,
      notas: data.notas || null,
    })
    .select()
    .single()

  if (recetaError) throw new Error(recetaError.message)

  // Create items
  if (data.items.length > 0) {
    const items = data.items.map((item) => ({
      receta_id: receta.id,
      insumo_id: item.insumo_id,
      cantidad: item.cantidad,
      notas: item.notas || null,
    }))

    const { error: itemsError } = await supabase
      .from("receta_insumos")
      .insert(items)

    if (itemsError) throw new Error(itemsError.message)
  }

  revalidatePath(`/productos/${data.producto_id}`)
  return receta
}

export async function calcularCostoReceta(productoId: string) {
  const receta = await getRecetaByProducto(productoId)
  if (!receta?.items) return 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return receta.items.reduce((total: number, item: any) => {
    const costoInsumo = Number(item.insumo?.costo_unitario || 0)
    return total + (Number(item.cantidad) * costoInsumo)
  }, 0)
}
