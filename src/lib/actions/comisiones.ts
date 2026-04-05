"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getComisionesConfig() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("comisiones_config")
    .select("*")
    .order("id")

  return data || []
}

export async function actualizarComisionesConfig(
  configs: Array<{ id: number; tasa_porcentaje: number; activo: boolean }>
) {
  const supabase = await createClient()

  for (const c of configs) {
    await supabase
      .from("comisiones_config")
      .update({
        tasa_porcentaje: c.tasa_porcentaje,
        activo: c.activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id)
  }

  revalidatePath("/configuracion/comisiones")
}
