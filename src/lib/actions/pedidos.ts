"use server"

import { createClient } from "@/lib/supabase/server"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"
import type { CrearPedidoInput } from "@/lib/validations/pedidos"
import type { EstadoInterno } from "@/types/database"
import { revalidatePath } from "next/cache"
import { getCotizacionVenta } from "@/lib/dolar-api"

export async function getPedidos(filters?: {
  estado_interno?: EstadoInterno
  tipo?: "estandar" | "personalizado"
  prioridad?: "urgente" | "normal" | "baja"
  busqueda?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("pedidos")
    .select(`
      *,
      cliente:clientes(id, nombre, email, telefono),
      items:items_pedido(count),
      tareas_total:tareas(count),
      tareas_completadas:tareas(count)
    `, { count: "exact" })
    .order("created_at", { ascending: false })

  if (filters?.estado_interno) {
    query = query.eq("estado_interno", filters.estado_interno)
  }
  if (filters?.tipo) {
    query = query.eq("tipo", filters.tipo)
  }
  if (filters?.prioridad) {
    query = query.eq("prioridad", filters.prioridad)
  }
  if (filters?.busqueda) {
    query = query.or(`numero_tn.ilike.%${filters.busqueda}%`)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { data, count }
}

export async function getPedidosKanban() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      *,
      cliente:clientes(id, nombre),
      tareas_completadas:tareas(count)
    `)
    .not("estado_interno", "in", '("cerrado","cancelado")')
    .order("prioridad", { ascending: true })
    .order("fecha_comprometida", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getPedido(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      *,
      cliente:clientes(*),
      tienda:tiendas(id, nombre, tienda_nube_store_id),
      items:items_pedido(
        *,
        producto:productos(nombre, sku),
        variante:variantes(nombre)
      ),
      tareas(
        *,
        responsable:usuarios(id, nombre, rol),
        subtareas(*)
      ),
      pagos(*),
      historial:historial_pedido(
        *,
        usuario:usuarios(id, nombre)
      ),
      comentarios(
        *,
        usuario:usuarios(id, nombre, avatar_url)
      ),
      archivos(*)
    `)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function crearPedido(input: CrearPedidoInput) {
  const supabase = await createClient()

  // Snapshot cotización USD
  const cotizacionUsd = await getCotizacionVenta("blue")
  const montoTotalUsd = cotizacionUsd ? input.monto_total / cotizacionUsd : null

  // Crear el pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: input.cliente_id,
      tipo: input.tipo,
      prioridad: input.prioridad,
      fecha_comprometida: input.fecha_comprometida,
      tipo_despacho: input.tipo_despacho,
      observaciones: input.observaciones,
      monto_total: input.monto_total,
      monto_pagado: 0,
      estado_interno: "nuevo",
      estado_publico: "recibido",
      cotizacion_usd: cotizacionUsd,
      cotizacion_tipo: "blue",
      monto_total_usd: montoTotalUsd ? Math.round(montoTotalUsd * 100) / 100 : null,
    })
    .select()
    .single()

  if (pedidoError) throw new Error(pedidoError.message)

  // Crear los items
  const items = input.items.map((item) => ({
    pedido_id: pedido.id,
    producto_id: item.producto_id,
    variante_id: item.variante_id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    costo_unitario: item.costo_unitario,
    personalizacion: item.personalizacion,
  }))

  const { error: itemsError } = await supabase
    .from("items_pedido")
    .insert(items)

  if (itemsError) throw new Error(itemsError.message)

  // Registrar en historial
  await supabase.from("historial_pedido").insert({
    pedido_id: pedido.id,
    accion: "Pedido creado manualmente",
    estado_nuevo: "nuevo",
  })

  revalidatePath("/pedidos")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pedido as any
}

export async function actualizarEstadoPedido(pedidoId: string, nuevoEstado: EstadoInterno) {
  const supabase = await createClient()

  const estadoPublico = ESTADO_INTERNO_A_PUBLICO[nuevoEstado]

  const { error } = await supabase
    .from("pedidos")
    .update({
      estado_interno: nuevoEstado,
      estado_publico: estadoPublico,
    })
    .eq("id", pedidoId)

  if (error) throw new Error(error.message)

  // Si el estado es "sena_recibida" (habilitado), generar tareas
  if (nuevoEstado === "sena_recibida") {
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("tipo")
      .eq("id", pedidoId)
      .single()

    if (pedido) {
      await supabase.rpc("generar_tareas_pedido", {
        p_pedido_id: pedidoId,
        p_tipo: pedido.tipo,
      })
    }
  }

  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${pedidoId}`)
}

export async function actualizarPedido(
  pedidoId: string,
  data: { prioridad?: string; fecha_comprometida?: string; observaciones?: string; tipo_despacho?: string }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("pedidos")
    .update(data)
    .eq("id", pedidoId)

  if (error) throw new Error(error.message)

  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${pedidoId}`)
}
