"use server"

import { createClient } from "@/lib/supabase/server"
import type { ConfigEtapa, ConfigKanbanColumna } from "@/lib/config/tipos"

export async function guardarConfigEtapas(etapas: ConfigEtapa[]) {
  const supabase = await createClient()

  for (const etapa of etapas) {
    const { error } = await supabase
      .from("config_etapas")
      .update({
        label_custom: etapa.label_custom,
        activo_logo_ser: etapa.activo_logo_ser,
        activo_marca_blanca: etapa.activo_marca_blanca,
        activo_personalizado: etapa.activo_personalizado,
        orden: etapa.orden,
        badge_color_bg: etapa.badge_color_bg,
        badge_color_text: etapa.badge_color_text,
        icono: etapa.icono,
        visible_en_portal: etapa.visible_en_portal,
        label_portal: etapa.label_portal,
      })
      .eq("id", etapa.id)

    if (error) throw new Error(`Error al guardar etapa ${etapa.estado_interno}: ${error.message}`)
  }
}

export async function guardarKanbanColumnas(columnas: ConfigKanbanColumna[]) {
  const supabase = await createClient()

  // Delete all existing columns
  const { error: deleteError } = await supabase
    .from("config_kanban_columnas")
    .delete()
    .gte("id", 0)

  if (deleteError) throw new Error(`Error al eliminar columnas: ${deleteError.message}`)

  // Insert new columns
  const rows = columnas.map((col, i) => ({
    nombre: col.nombre,
    orden: i,
    color: col.color,
    icono: col.icono,
    estados: col.estados,
    colapsada: col.colapsada,
  }))

  const { error: insertError } = await supabase
    .from("config_kanban_columnas")
    .insert(rows)

  if (insertError) throw new Error(`Error al guardar columnas: ${insertError.message}`)
}

export async function actualizarTipoPedido(pedidoId: string, tipo: string) {
  const supabase = await createClient()

  // Only allow updating tipo when estado is nuevo or pendiente_de_sena
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("estado_interno")
    .eq("id", pedidoId)
    .single()

  if (!pedido) throw new Error("Pedido no encontrado")

  const estadosPermitidos = ["nuevo", "pendiente_de_sena"]
  if (!estadosPermitidos.includes(pedido.estado_interno)) {
    throw new Error("Solo se puede cambiar el tipo en estado Nuevo o Pendiente de seña")
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ tipo })
    .eq("id", pedidoId)

  if (error) throw new Error(`Error al actualizar tipo: ${error.message}`)
}
