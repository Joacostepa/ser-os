"use server"

import { createClient } from "@/lib/supabase/server"

export async function getPedidosOperaciones(filtros?: {
  estado?: string
  tipo?: string
  prioridad?: string
  busqueda?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("pedidos")
    .select(`
      *,
      cliente:clientes(id, nombre, email, telefono),
      tienda:tiendas(id, nombre, canal)
    `)
    .not("estado_interno", "in", '("despachado","cerrado","cancelado")')
    .order("created_at", { ascending: false })
    .limit(500)

  if (filtros?.estado && filtros.estado !== "todos") {
    query = query.eq("estado_interno", filtros.estado)
  }
  if (filtros?.tipo && filtros.tipo !== "todos") {
    query = query.eq("tipo", filtros.tipo)
  }
  if (filtros?.prioridad && filtros.prioridad !== "todos") {
    query = query.eq("prioridad", filtros.prioridad)
  }
  if (filtros?.busqueda) {
    query = query.or(`numero_tn.ilike.%${filtros.busqueda}%`)
  }

  const { data: pedidos, error } = await query
  if (error) throw new Error(error.message)

  // Fetch tareas counts for all pedidos in one query
  const pedidoIds = pedidos?.map((p) => p.id) || []

  let tareasMap: Record<string, { completadas: number; total: number }> = {}
  if (pedidoIds.length > 0) {
    const { data: tareas } = await supabase
      .from("tareas")
      .select("pedido_id, estado")
      .in("pedido_id", pedidoIds)

    tareasMap = {}
    tareas?.forEach((t) => {
      if (!t.pedido_id) return
      if (!tareasMap[t.pedido_id]) tareasMap[t.pedido_id] = { completadas: 0, total: 0 }
      tareasMap[t.pedido_id].total++
      if (t.estado === "terminada") tareasMap[t.pedido_id].completadas++
    })
  }

  return (pedidos || []).map((p) => ({
    ...p,
    tareas_completadas: tareasMap[p.id]?.completadas ?? 0,
    tareas_total: tareasMap[p.id]?.total ?? 0,
  }))
}

export async function getPedidoResumen(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pedidos")
    .select("*, cliente:clientes(*)")
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)

  const [
    { data: items },
    { data: tareas },
    { data: pagos },
    { data: historial },
    { data: comentarios },
  ] = await Promise.all([
    supabase.from("items_pedido").select("*, producto:productos(nombre, sku), variante:variantes(nombre)").eq("pedido_id", id),
    supabase.from("tareas").select("*, responsable:usuarios(id, nombre, rol), subtareas(*)").eq("pedido_id", id).order("orden", { ascending: true }),
    supabase.from("pagos").select("*").eq("pedido_id", id).order("fecha", { ascending: true }),
    supabase.from("historial_pedido").select("*, usuario:usuarios(id, nombre)").eq("pedido_id", id).order("created_at", { ascending: false }),
    supabase.from("comentarios").select("*, usuario:usuarios(id, nombre)").eq("entidad_tipo", "pedido").eq("entidad_id", id).order("created_at", { ascending: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...data, items, tareas, pagos, historial, comentarios } as any
}
