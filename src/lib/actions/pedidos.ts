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

  // Fetch pedido base data
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, cliente:clientes(*)")
    .eq("id", id)
    .single()

  if (error) {
    console.error("getPedido error:", error.message, error.details, error.hint)
    throw new Error(error.message)
  }

  // Fetch all relations separately to avoid join ambiguity
  const [
    { data: items },
    { data: tareas },
    { data: pagos },
    { data: historial },
    { data: comentarios },
    { data: archivos },
    { data: comisiones },
  ] = await Promise.all([
    supabase
      .from("items_pedido")
      .select("*, producto:productos(nombre, sku), variante:variantes(nombre)")
      .eq("pedido_id", id),
    supabase
      .from("tareas")
      .select("*, responsable:usuarios(id, nombre, rol), subtareas(*)")
      .eq("pedido_id", id)
      .order("orden", { ascending: true }),
    supabase
      .from("pagos")
      .select("*")
      .eq("pedido_id", id)
      .order("fecha", { ascending: true }),
    supabase
      .from("historial_pedido")
      .select("*, usuario:usuarios(id, nombre)")
      .eq("pedido_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("comentarios")
      .select("*, usuario:usuarios(id, nombre, avatar_url)")
      .eq("entidad_tipo", "pedido")
      .eq("entidad_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("archivos")
      .select("*")
      .eq("entidad_tipo", "pedido")
      .eq("entidad_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("comisiones_pedido")
      .select("*")
      .eq("pedido_id", id)
      .order("created_at", { ascending: true }),
  ])

  // Fetch tienda separately (nullable FK)
  let tienda = null
  if (data.tienda_id) {
    const { data: t } = await supabase
      .from("tiendas")
      .select("id, nombre, tienda_nube_store_id")
      .eq("id", data.tienda_id)
      .single()
    tienda = t
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...data, items, tareas, pagos, historial, comentarios, archivos, comisiones, tienda } as any
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

export async function actualizarEstadoPedido(
  pedidoId: string,
  nuevoEstado: EstadoInterno | string,
  datos?: { subestado?: string; motivo?: string; observaciones?: string }
) {
  const { ejecutarTransicion } = await import("@/lib/maquina-estados")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await ejecutarTransicion(pedidoId, nuevoEstado as string, datos as any)
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
