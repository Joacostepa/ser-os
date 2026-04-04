"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { EstadoCompra } from "@/types/database"

export async function getCompras(filtros?: {
  busqueda?: string
  estado?: EstadoCompra
  proveedor_id?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("compras")
    .select(`
      *,
      proveedor:proveedores(id, nombre),
      pedido:pedidos(id, numero_tn),
      items:items_compra(count)
    `)
    .order("created_at", { ascending: false })

  if (filtros?.estado) {
    query = query.eq("estado", filtros.estado)
  }
  if (filtros?.proveedor_id) {
    query = query.eq("proveedor_id", filtros.proveedor_id)
  }
  if (filtros?.busqueda) {
    query = query.or(`notas.ilike.%${filtros.busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getCompra(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("compras")
    .select(`
      *,
      proveedor:proveedores(id, nombre, telefono, email, rubro),
      pedido:pedidos(id, numero_tn, estado_interno, cliente:clientes(nombre)),
      items:items_compra(
        *,
        producto:productos(id, nombre, sku)
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any
}

export async function crearCompra(data: {
  proveedor_id: string
  pedido_id?: string
  fecha_esperada?: string
  notas?: string
  items: {
    producto_id?: string
    descripcion: string
    cantidad: number
    precio_unitario: number
    notas?: string
  }[]
}) {
  const supabase = await createClient()

  // Create compra
  const { data: compra, error: compraError } = await supabase
    .from("compras")
    .insert({
      proveedor_id: data.proveedor_id,
      pedido_id: data.pedido_id || null,
      fecha_esperada: data.fecha_esperada || null,
      notas: data.notas || null,
      estado: "borrador",
    })
    .select()
    .single()

  if (compraError) throw new Error(compraError.message)

  // Create items
  if (data.items.length > 0) {
    const items = data.items.map((item) => ({
      compra_id: compra.id,
      producto_id: item.producto_id || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      cantidad_recibida: 0,
      notas: item.notas || null,
    }))

    const { error: itemsError } = await supabase
      .from("items_compra")
      .insert(items)

    if (itemsError) throw new Error(itemsError.message)
  }

  revalidatePath("/compras")
  return compra
}

export async function actualizarEstadoCompra(id: string, estado: EstadoCompra) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { estado }

  if (estado === "recibida") {
    updateData.fecha_recibida = new Date().toISOString().split("T")[0]
  }

  const { error } = await supabase
    .from("compras")
    .update(updateData)
    .eq("id", id)

  if (error) throw new Error(error.message)

  // If fully received, mark all items as received
  if (estado === "recibida") {
    const { data: items } = await supabase
      .from("items_compra")
      .select("id, cantidad")
      .eq("compra_id", id)

    if (items) {
      for (const item of items) {
        await supabase
          .from("items_compra")
          .update({ cantidad_recibida: item.cantidad })
          .eq("id", item.id)
      }
    }
  }

  revalidatePath("/compras")
  revalidatePath(`/compras/${id}`)
}

export async function recibirItem(itemId: string, cantidadRecibida: number, compraId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("items_compra")
    .update({ cantidad_recibida: cantidadRecibida })
    .eq("id", itemId)

  if (error) throw new Error(error.message)

  // Check if all items are fully received → update compra estado
  const { data: items } = await supabase
    .from("items_compra")
    .select("cantidad, cantidad_recibida")
    .eq("compra_id", compraId)

  if (items) {
    const allReceived = items.every((i) => i.cantidad_recibida >= i.cantidad)
    const someReceived = items.some((i) => i.cantidad_recibida > 0)

    if (allReceived) {
      await supabase
        .from("compras")
        .update({ estado: "recibida", fecha_recibida: new Date().toISOString().split("T")[0] })
        .eq("id", compraId)
    } else if (someReceived) {
      await supabase
        .from("compras")
        .update({ estado: "recibida_parcial" })
        .eq("id", compraId)
    }
  }

  revalidatePath(`/compras/${compraId}`)
  revalidatePath("/compras")
}

export async function actualizarCompra(
  id: string,
  data: {
    fecha_esperada?: string | null
    notas?: string | null
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("compras")
    .update(data)
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/compras")
  revalidatePath(`/compras/${id}`)
}
