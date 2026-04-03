"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getMisTareas() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_id", user.id)
    .single()

  if (!usuario) throw new Error("Usuario no encontrado")

  const { data, error } = await supabase
    .from("tareas")
    .select(`
      *,
      pedido:pedidos(id, numero_tn, tipo, prioridad, estado_interno, cliente:clientes(nombre)),
      responsable:usuarios(id, nombre)
    `)
    .eq("responsable_id", usuario.id)
    .in("estado", ["pendiente", "en_proceso", "bloqueada"])
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getTodasLasTareas(filtros?: { estado?: string; area?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from("tareas")
    .select(`
      *,
      pedido:pedidos(id, numero_tn, tipo, prioridad, estado_interno, cliente:clientes(nombre)),
      responsable:usuarios(id, nombre)
    `)
    .order("created_at", { ascending: false })

  if (filtros?.estado && filtros.estado !== "todos") {
    query = query.eq("estado", filtros.estado)
  }
  if (filtros?.area && filtros.area !== "todos") {
    query = query.eq("area", filtros.area)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function completarTarea(tareaId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_id", user.id)
    .single()

  // Verificar dependencias
  const { data: tarea } = await supabase
    .from("tareas")
    .select("depende_de, pedido_id")
    .eq("id", tareaId)
    .single()

  if (tarea?.depende_de && tarea.depende_de.length > 0) {
    const { data: dependencias } = await supabase
      .from("tareas")
      .select("id, estado")
      .in("id", tarea.depende_de)

    const incompletas = dependencias?.filter((d) => d.estado !== "terminada")
    if (incompletas && incompletas.length > 0) {
      throw new Error("Hay tareas previas sin completar")
    }
  }

  // Marcar como completada
  const { error } = await supabase
    .from("tareas")
    .update({
      estado: "terminada",
      completada_por: usuario?.id,
      completada_en: new Date().toISOString(),
    })
    .eq("id", tareaId)

  if (error) throw new Error(error.message)

  // Desbloquear tareas dependientes
  if (tarea?.pedido_id) {
    const { data: tareasDelPedido } = await supabase
      .from("tareas")
      .select("id, depende_de, estado")
      .eq("pedido_id", tarea.pedido_id)
      .eq("estado", "bloqueada")

    if (tareasDelPedido) {
      for (const t of tareasDelPedido) {
        if (t.depende_de?.includes(tareaId)) {
          // Verificar si TODAS las dependencias están completas
          const { data: deps } = await supabase
            .from("tareas")
            .select("id, estado")
            .in("id", t.depende_de)

          const todasCompletas = deps?.every((d) => d.estado === "terminada" || d.id === tareaId)
          if (todasCompletas) {
            await supabase
              .from("tareas")
              .update({ estado: "pendiente" })
              .eq("id", t.id)
          }
        }
      }
    }

    revalidatePath(`/pedidos/${tarea.pedido_id}`)
  }

  revalidatePath("/tareas")
}

export async function iniciarTarea(tareaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tareas")
    .update({ estado: "en_proceso" })
    .eq("id", tareaId)

  if (error) throw new Error(error.message)
  revalidatePath("/tareas")
}
