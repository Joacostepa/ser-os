"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Creates checklist steps for an order based on its template.
 * Looks up checklist_templates by tipo_pedido, then inserts
 * each paso into pedido_pasos.
 */
export async function crearChecklistPedido(
  pedidoId: string,
  tipoPedido: string,
): Promise<void> {
  const supabase = await createClient()

  // 1. Get the template for this order type
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("pasos")
    .eq("tipo_pedido", tipoPedido)
    .eq("activo", true)
    .single()

  if (!template?.pasos) {
    // No template found — try a generic "estandar" fallback
    const { data: fallback } = await supabase
      .from("checklist_templates")
      .select("pasos")
      .eq("tipo_pedido", "estandar")
      .eq("activo", true)
      .single()

    if (!fallback?.pasos) return

    await insertarPasos(supabase, pedidoId, fallback.pasos as TemplatePaso[])
    return
  }

  await insertarPasos(supabase, pedidoId, template.pasos as TemplatePaso[])
}

interface TemplatePaso {
  titulo: string
  seccion?: string
  asignado_default?: string | null
}

async function insertarPasos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  pedidoId: string,
  pasos: TemplatePaso[],
): Promise<void> {
  // Pre-fetch users by area for assignment resolution
  const areasNeeded = [
    ...new Set(
      pasos
        .map((p) => p.asignado_default)
        .filter((a): a is string => !!a),
    ),
  ]

  // Build a map of area/role -> user id
  const areaUserMap: Record<string, string> = {}

  if (areasNeeded.length > 0) {
    // Check if it's a UUID (direct user assignment) or an area name
    const uuids = areasNeeded.filter((a) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a),
    )
    const areas = areasNeeded.filter(
      (a) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a),
    )

    // For UUIDs, map directly
    for (const uuid of uuids) {
      areaUserMap[uuid] = uuid
    }

    // For area names, find a user in that area
    if (areas.length > 0) {
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("id, area")
        .eq("activo", true)
        .in("area", areas)

      if (usuarios) {
        for (const u of usuarios) {
          // First user found for each area wins
          if (u.area && !areaUserMap[u.area]) {
            areaUserMap[u.area] = u.id
          }
        }
      }
    }
  }

  // Build the rows
  const rows = pasos.map((paso, idx) => ({
    pedido_id: pedidoId,
    titulo: paso.titulo,
    seccion: paso.seccion || null,
    orden: idx,
    completado: false,
    asignado_a: paso.asignado_default
      ? areaUserMap[paso.asignado_default] || null
      : null,
  }))

  if (rows.length > 0) {
    const { error } = await supabase.from("pedido_pasos").insert(rows)
    if (error) {
      console.error("[checklist] Error inserting pasos:", error.message)
    }
  }
}
