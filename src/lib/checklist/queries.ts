"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Get all pasos for a specific pedido, ordered by orden.
 */
export async function getPasosPedido(pedidoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pedido_pasos")
    .select(
      "*, asignado:usuarios!pedido_pasos_asignado_a_fkey(id, nombre), completador:usuarios!pedido_pasos_completado_por_fkey(id, nombre)",
    )
    .eq("pedido_id", pedidoId)
    .order("orden", { ascending: true })

  if (error) {
    // Fallback without joins if FK names differ
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("pedido_pasos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("orden", { ascending: true })

    if (fallbackError) throw new Error(fallbackError.message)
    return fallbackData ?? []
  }

  return data ?? []
}

/**
 * Get "Mi dia" data for a user: incomplete pasos assigned to them
 * + their free tareas (from the tareas table, no pedido).
 */
export async function getMiDia(usuarioId: string) {
  const supabase = await createClient()

  // 1. Pasos assigned to user, incomplete
  const { data: pasos } = await supabase
    .from("pedido_pasos")
    .select(
      "*, pedido:pedidos(id, numero_tn, tipo, cliente:clientes(nombre))",
    )
    .eq("asignado_a", usuarioId)
    .eq("completado", false)
    .order("orden", { ascending: true })

  // 2. Free tareas (from old tareas table) assigned to user, not finished
  const { data: tareas } = await supabase
    .from("tareas")
    .select("id, titulo, prioridad, fecha_limite, estado, pedido_id")
    .eq("responsable_id", usuarioId)
    .is("pedido_id", null)
    .neq("estado", "terminada")
    .order("created_at", { ascending: true })

  // Group pasos by pedido
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidoGroups: Record<string, { pedido: any; pasos: any[] }> = {}
  for (const paso of pasos ?? []) {
    const pid = paso.pedido_id
    if (!pedidoGroups[pid]) {
      pedidoGroups[pid] = {
        pedido: paso.pedido,
        pasos: [],
      }
    }
    pedidoGroups[pid].pasos.push(paso)
  }

  return {
    pedidoGroups: Object.values(pedidoGroups),
    tareasLibres: tareas ?? [],
  }
}

/**
 * Get all incomplete pasos + free tareas, grouped by assigned person.
 * Used for the "Equipo" tab.
 */
export async function getEquipo() {
  const supabase = await createClient()

  // 1. All incomplete pasos
  const { data: pasos } = await supabase
    .from("pedido_pasos")
    .select(
      "*, pedido:pedidos(id, numero_tn), asignado:usuarios!pedido_pasos_asignado_a_fkey(id, nombre)",
    )
    .eq("completado", false)
    .order("orden", { ascending: true })

  // 2. All free tareas (pendientes)
  const { data: tareas } = await supabase
    .from("tareas")
    .select(
      "id, titulo, prioridad, fecha_limite, estado, pedido_id, responsable:usuarios(id, nombre)",
    )
    .is("pedido_id", null)
    .neq("estado", "terminada")
    .order("created_at", { ascending: true })

  // Group by person
  interface GroupItem {
    tipo: "paso" | "tarea"
    id: string
    titulo: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pedido?: any
    prioridad?: string
    fecha_limite?: string | null
  }

  const groups: Record<string, { nombre: string; items: GroupItem[] }> = {}

  const addToGroup = (personId: string | null, nombre: string, item: GroupItem) => {
    const key = personId || "sin_asignar"
    if (!groups[key]) {
      groups[key] = { nombre, items: [] }
    }
    groups[key].items.push(item)
  }

  for (const paso of pasos ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asignado = paso.asignado as any
    addToGroup(
      asignado?.id ?? null,
      asignado?.nombre ?? "Sin asignar",
      {
        tipo: "paso",
        id: paso.id,
        titulo: paso.titulo,
        pedido: paso.pedido,
      },
    )
  }

  for (const tarea of tareas ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responsable = tarea.responsable as any
    addToGroup(
      responsable?.id ?? null,
      responsable?.nombre ?? "Sin asignar",
      {
        tipo: "tarea",
        id: tarea.id,
        titulo: tarea.titulo,
        prioridad: tarea.prioridad,
        fecha_limite: tarea.fecha_limite,
      },
    )
  }

  return Object.entries(groups).map(([id, group]) => ({
    personId: id,
    nombre: group.nombre,
    items: group.items,
    count: group.items.length,
  }))
}
