"use server"

import { createClient } from "@/lib/supabase/server"
import type { ConfigEtapa, ConfigKanbanColumna } from "./tipos"

export async function getConfigEtapas(): Promise<ConfigEtapa[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("config_etapas")
    .select("*")
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ConfigEtapa[]
}

export async function getEstadoLabel(estadoInterno: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("config_etapas")
    .select("label_custom, label_default")
    .eq("estado_interno", estadoInterno)
    .single()

  if (!data) return estadoInterno
  return data.label_custom || data.label_default
}

export async function getEstadoBadgeStyle(
  estadoInterno: string,
): Promise<{ bg: string; text: string }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("config_etapas")
    .select("badge_color_bg, badge_color_text")
    .eq("estado_interno", estadoInterno)
    .single()

  if (!data) return { bg: "bg-stone-100", text: "text-stone-600" }
  return { bg: data.badge_color_bg, text: data.badge_color_text }
}

export async function getKanbanColumnas(): Promise<ConfigKanbanColumna[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("config_kanban_columnas")
    .select("*")
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ConfigKanbanColumna[]
}
