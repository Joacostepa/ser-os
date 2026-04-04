"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { TipoInsumo, UnidadInsumo } from "@/types/database"

export async function getInsumos(filtros?: {
  busqueda?: string
  tipo?: TipoInsumo
  bajo_stock?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from("insumos")
    .select(`
      *,
      proveedor:proveedores(id, nombre)
    `)
    .order("nombre", { ascending: true })

  if (filtros?.tipo) {
    query = query.eq("tipo", filtros.tipo)
  }
  if (filtros?.busqueda) {
    query = query.or(`nombre.ilike.%${filtros.busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // Filter bajo stock in JS (can't do computed column comparison in Supabase)
  if (filtros?.bajo_stock) {
    return data?.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo) && i.tipo === "material") ?? []
  }

  return data
}

export async function getInsumo(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("insumos")
    .select(`
      *,
      proveedor:proveedores(id, nombre, telefono, email),
      producto:productos(id, nombre, sku),
      movimientos:movimientos_stock(
        id, tipo, cantidad, stock_anterior, stock_posterior,
        referencia_tipo, referencia_id, notas, created_at
      )
    `)
    .eq("id", id)
    .order("created_at", { referencedTable: "movimientos_stock", ascending: false })
    .single()

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any
}

export async function crearInsumo(data: {
  nombre: string
  tipo: TipoInsumo
  unidad: UnidadInsumo
  stock_minimo?: number
  costo_unitario?: number
  unidad_compra?: string
  rendimiento?: number
  proveedor_id?: string
  producto_id?: string
  notas?: string
}) {
  const supabase = await createClient()

  const { data: insumo, error } = await supabase
    .from("insumos")
    .insert({
      nombre: data.nombre,
      tipo: data.tipo,
      unidad: data.unidad,
      stock_actual: 0,
      stock_minimo: data.stock_minimo || 0,
      costo_unitario: data.costo_unitario || 0,
      unidad_compra: data.unidad_compra || null,
      rendimiento: data.rendimiento || 1,
      proveedor_id: data.proveedor_id || null,
      producto_id: data.producto_id || null,
      notas: data.notas || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/insumos")
  return insumo
}

export async function actualizarInsumo(
  id: string,
  data: {
    nombre?: string
    tipo?: TipoInsumo
    unidad?: UnidadInsumo
    stock_minimo?: number
    costo_unitario?: number
    unidad_compra?: string | null
    rendimiento?: number
    proveedor_id?: string | null
    producto_id?: string | null
    notas?: string | null
    activo?: boolean
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("insumos")
    .update(data)
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/insumos")
  revalidatePath(`/insumos/${id}`)
}

export async function getInsumosSelect() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("insumos")
    .select("id, nombre, tipo, unidad, stock_actual, costo_unitario")
    .eq("activo", true)
    .order("nombre")

  if (error) throw new Error(error.message)
  return data
}
