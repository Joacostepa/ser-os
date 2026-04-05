"use server"

import { createClient } from "@/lib/supabase/server"
import { crearNotificacion } from "./crear-notificacion"

export async function detectarStockCritico() {
  const supabase = await createClient()
  const hoy = new Date().toISOString().split("T")[0]

  // Find insumos where stock is below minimum
  const { data: criticos } = await supabase
    .from("insumos")
    .select("id, nombre, stock_actual, stock_minimo, unidad")
    .eq("activo", true)
    .eq("tipo", "material")
    .gt("stock_minimo", 0)

  for (const insumo of criticos || []) {
    // Only notify if stock is actually below minimum
    if (insumo.stock_actual >= insumo.stock_minimo) continue

    // Check if already notified today for this insumo
    const { count } = await supabase
      .from("notificaciones")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "stock_critico")
      .eq("recurso_id", insumo.id)
      .gte("created_at", hoy + "T00:00:00")

    if ((count ?? 0) === 0) {
      await crearNotificacion({
        tipo: "stock_critico",
        datos: {
          insumo_nombre: insumo.nombre,
          stock_actual: insumo.stock_actual,
          stock_minimo: insumo.stock_minimo,
          unidad: insumo.unidad,
        },
        recurso_id: insumo.id,
      })
    }
  }
}
