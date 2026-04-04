"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getChecklistTemplates() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("activo", true)
    .order("tipo_pedido")

  if (error) throw new Error(error.message)
  return data || []
}

export async function getChecklistTemplate(tipoPedido: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("tipo_pedido", tipoPedido)
    .eq("activo", true)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function guardarPlantilla(
  tipoPedido: string,
  pasos: { titulo: string; seccion: string; asignado_default: string | null }[]
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("checklist_templates")
    .update({
      pasos: JSON.stringify(pasos),
      updated_at: new Date().toISOString(),
    })
    .eq("tipo_pedido", tipoPedido)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/plantillas")
}
