"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Toggle a paso's completado state.
 */
export async function togglePaso(
  pasoId: string,
  completado: boolean,
): Promise<void> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let usuarioId: string | null = null
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("auth_id", user.id)
      .single()
    usuarioId = usuario?.id ?? null
  }

  const { error } = await supabase
    .from("pedido_pasos")
    .update({
      completado,
      completado_at: completado ? new Date().toISOString() : null,
      completado_por: completado ? usuarioId : null,
    })
    .eq("id", pasoId)

  if (error) throw new Error(error.message)

  // Check if all pasos are now complete (only when marking as done)
  if (completado) {
    try {
      // Get the pedido_id for this paso
      const { data: paso } = await supabase
        .from("pedido_pasos")
        .select("pedido_id")
        .eq("id", pasoId)
        .single()

      if (paso?.pedido_id) {
        const { count: totalPasos } = await supabase
          .from("pedido_pasos")
          .select("*", { count: "exact", head: true })
          .eq("pedido_id", paso.pedido_id)

        const { count: pasosCompletos } = await supabase
          .from("pedido_pasos")
          .select("*", { count: "exact", head: true })
          .eq("pedido_id", paso.pedido_id)
          .eq("completado", true)

        if (totalPasos && pasosCompletos && totalPasos === pasosCompletos) {
          const { data: pedido } = await supabase
            .from("pedidos")
            .select("numero_tn, numero_interno, cliente:clientes(nombre)")
            .eq("id", paso.pedido_id)
            .single()

          const numero =
            pedido?.numero_tn || pedido?.numero_interno || paso.pedido_id.slice(0, 8)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cliente = (pedido?.cliente as any)?.nombre || ""

          const { crearNotificacion } = await import(
            "@/lib/notificaciones/crear-notificacion"
          )
          await crearNotificacion({
            tipo: "checklist_completo",
            datos: { numero, cliente },
            recurso_id: paso.pedido_id,
            actor_id: usuarioId || undefined,
          })
        }
      }
    } catch {
      /* ignore notification errors */
    }
  }

  revalidatePath("/pedidos")
  revalidatePath("/tareas")
}

/**
 * Add a new paso to a pedido's checklist.
 */
export async function agregarPaso(
  pedidoId: string,
  titulo: string,
  seccion?: string,
): Promise<void> {
  const supabase = await createClient()

  // Get max orden for this pedido
  const { data: maxRow } = await supabase
    .from("pedido_pasos")
    .select("orden")
    .eq("pedido_id", pedidoId)
    .order("orden", { ascending: false })
    .limit(1)
    .single()

  const nextOrden = (maxRow?.orden ?? -1) + 1

  const { error } = await supabase.from("pedido_pasos").insert({
    pedido_id: pedidoId,
    titulo,
    seccion: seccion || null,
    orden: nextOrden,
    completado: false,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/pedidos")
  revalidatePath("/tareas")
}

/**
 * Assign a paso to a user (or unassign).
 */
export async function asignarPaso(
  pasoId: string,
  asignadoA: string | null,
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("pedido_pasos")
    .update({ asignado_a: asignadoA })
    .eq("id", pasoId)

  if (error) throw new Error(error.message)

  revalidatePath("/pedidos")
  revalidatePath("/tareas")
}
