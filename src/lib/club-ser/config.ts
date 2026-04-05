"use server"

import { createClient } from "@/lib/supabase/server"

export async function getClubConfig(): Promise<Record<string, number | string>> {
  const supabase = await createClient()
  const { data } = await supabase.from("club_ser_config").select("clave, valor")
  const config: Record<string, number | string> = {}
  for (const row of data || []) {
    const num = Number(row.valor)
    config[row.clave] = isNaN(num) ? row.valor : num
  }
  return config
}
