"use server"

import { createClient } from "@/lib/supabase/server"

export async function getProductos(busqueda?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("productos")
    .select(`
      *,
      variantes(id, nombre, sku, stock_actual, stock_reservado, precio, costo),
      productos_tienda(tienda_id, tienda_nube_product_id, publicado, tienda:tiendas(nombre, canal))
    `)
    .eq("activo", true)
    .order("nombre")

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,sku.ilike.%${busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any[]
}

export async function getProducto(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("productos")
    .select(`
      *,
      variantes(
        *,
        variantes_tienda(tienda_id, tienda_nube_variant_id, stock_tn, precio_tn, tienda:tiendas(nombre, canal))
      ),
      productos_tienda(tienda_id, tienda_nube_product_id, publicado, tienda:tiendas(nombre, canal))
    `)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any
}

export async function actualizarCostoBase(productoId: string, costoBase: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("productos")
    .update({ costo_base: costoBase })
    .eq("id", productoId)

  if (error) throw new Error(error.message)

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/productos/${productoId}`)
  revalidatePath("/productos")
}
