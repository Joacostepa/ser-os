"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const TAREA_SELECT = `
  *,
  pedido:pedidos(id, numero_tn, cliente:clientes(nombre)),
  responsable:usuarios(id, nombre),
  subtareas(id, titulo, completada, orden)
`

// ─── Get current authenticated usuario ─────────────────────────
async function getUsuarioActual() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nombre")
    .eq("auth_id", user.id)
    .single()

  if (!usuario) throw new Error("Usuario no encontrado")
  return { supabase, usuario }
}

// ─── Mis tareas ─────────────────────────────────────────────────
export async function getMisTareas() {
  const { supabase, usuario } = await getUsuarioActual()

  const { data, error } = await supabase
    .from("tareas")
    .select(TAREA_SELECT)
    .eq("responsable_id", usuario.id)
    .in("estado", ["pendiente", "en_proceso", "bloqueada"])
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

// ─── Tareas equipo ──────────────────────────────────────────────
export async function getTareasEquipo() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tareas")
    .select(TAREA_SELECT)
    .in("estado", ["pendiente", "en_proceso", "bloqueada"])
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

// ─── Tareas vencidas ────────────────────────────────────────────
export async function getTareasVencidas() {
  const supabase = await createClient()
  const hoy = new Date().toISOString()

  const { data, error } = await supabase
    .from("tareas")
    .select(TAREA_SELECT)
    .lt("fecha_limite", hoy)
    .neq("estado", "terminada")
    .order("fecha_limite", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

// ─── Todas las tareas con filtros ───────────────────────────────
export async function getTodasTareas(filtros?: {
  estado?: string
  area?: string
  asignado?: string
  prioridad?: string
  busqueda?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("tareas")
    .select(TAREA_SELECT)
    .order("created_at", { ascending: false })

  if (filtros?.estado && filtros.estado !== "todos") {
    query = query.eq("estado", filtros.estado)
  }
  if (filtros?.area && filtros.area !== "todos") {
    query = query.eq("area", filtros.area)
  }
  if (filtros?.asignado && filtros.asignado !== "todos") {
    query = query.eq("responsable_id", filtros.asignado)
  }
  if (filtros?.prioridad && filtros.prioridad !== "todos") {
    query = query.eq("prioridad", filtros.prioridad)
  }
  if (filtros?.busqueda) {
    query = query.ilike("titulo", `%${filtros.busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// ─── Crear tarea libre (sin pedido obligatorio) ─────────────────
export async function crearTareaLibre(data: {
  titulo: string
  descripcion?: string
  responsable_id?: string
  area?: string
  prioridad?: string
  fecha_limite?: string
  pedido_id?: string
  subtareas?: string[]
}) {
  const { supabase, usuario } = await getUsuarioActual()

  const { data: tarea, error } = await supabase
    .from("tareas")
    .insert({
      titulo: data.titulo,
      descripcion: data.descripcion || null,
      responsable_id: data.responsable_id || null,
      area: (data.area || "operaciones") as "diseno" | "operaciones" | "armado" | "logistica" | "admin",
      prioridad: data.prioridad || "normal",
      fecha_limite: data.fecha_limite || null,
      pedido_id: data.pedido_id || null,
      estado: "pendiente" as const,
      orden: 0,
      depende_de: [],
      creado_por: usuario.id,
      plantilla_tarea_id: null,
      completada_por: null,
      completada_en: null,
      fase: null,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  // Insert subtareas if any
  if (data.subtareas && data.subtareas.length > 0) {
    const subtareasToInsert = data.subtareas
      .filter((t) => t.trim() !== "")
      .map((titulo, idx) => ({
        tarea_id: tarea.id,
        titulo,
        completada: false,
        orden: idx,
      }))

    if (subtareasToInsert.length > 0) {
      const { error: subError } = await supabase
        .from("subtareas")
        .insert(subtareasToInsert)

      if (subError) throw new Error(subError.message)
    }
  }

  revalidatePath("/tareas")
  return tarea
}

// ─── Completar tarea ────────────────────────────────────────────
export async function completarTarea(tareaId: string) {
  const { supabase, usuario } = await getUsuarioActual()

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
      estado: "terminada" as const,
      completada_por: usuario.id,
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

          const todasCompletas = deps?.every(
            (d) => d.estado === "terminada" || d.id === tareaId
          )
          if (todasCompletas) {
            await supabase
              .from("tareas")
              .update({ estado: "pendiente" as const })
              .eq("id", t.id)
          }
        }
      }
    }

    revalidatePath(`/pedidos/${tarea.pedido_id}`)
  }

  revalidatePath("/tareas")
}

// ─── Iniciar tarea ──────────────────────────────────────────────
export async function iniciarTarea(tareaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tareas")
    .update({
      estado: "en_proceso" as const,
      fecha_inicio: new Date().toISOString(),
    })
    .eq("id", tareaId)

  if (error) throw new Error(error.message)
  revalidatePath("/tareas")
}

// ─── Actualizar tarea ───────────────────────────────────────────
export async function actualizarTarea(
  tareaId: string,
  data: {
    prioridad?: string
    fecha_limite?: string | null
    responsable_id?: string | null
    area?: string
    titulo?: string
    descripcion?: string | null
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tareas")
    .update(data)
    .eq("id", tareaId)

  if (error) throw new Error(error.message)
  revalidatePath("/tareas")
}

// ─── Eliminar tarea ─────────────────────────────────────────────
export async function eliminarTarea(tareaId: string) {
  const supabase = await createClient()

  // Only allow deleting free tasks (no pedido) — server-side check
  const { data: tarea } = await supabase
    .from("tareas")
    .select("pedido_id")
    .eq("id", tareaId)
    .single()

  if (tarea?.pedido_id) {
    throw new Error("No se puede eliminar una tarea vinculada a un pedido")
  }

  // Delete subtareas first
  await supabase.from("subtareas").delete().eq("tarea_id", tareaId)

  const { error } = await supabase.from("tareas").delete().eq("id", tareaId)

  if (error) throw new Error(error.message)
  revalidatePath("/tareas")
}

// ─── Toggle subtarea ────────────────────────────────────────────
export async function toggleSubtarea(subtareaId: string) {
  const supabase = await createClient()

  const { data: sub } = await supabase
    .from("subtareas")
    .select("completada")
    .eq("id", subtareaId)
    .single()

  if (!sub) throw new Error("Subtarea no encontrada")

  const { error } = await supabase
    .from("subtareas")
    .update({ completada: !sub.completada })
    .eq("id", subtareaId)

  if (error) throw new Error(error.message)
  revalidatePath("/tareas")
}
