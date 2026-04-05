"use server"

import { createClient } from "@/lib/supabase/server"
import { crearNotificacion } from "./crear-notificacion"

export async function detectarPedidosEstancados() {
  const supabase = await createClient()
  const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const hoy = new Date().toISOString().split("T")[0]

  const { data: estancados } = await supabase
    .from("pedidos")
    .select(
      "id, numero_tn, numero_interno, estado_interno, updated_at, cliente:clientes(nombre)",
    )
    .not("estado_interno", "in", '("cancelado","cerrado","entregado","despachado")')
    .lt("updated_at", hace5dias)

  for (const p of estancados || []) {
    // Check if already notified today
    const { count } = await supabase
      .from("notificaciones")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "pedido_estancado")
      .eq("recurso_id", p.id)
      .gte("created_at", hoy + "T00:00:00")

    if ((count ?? 0) === 0) {
      const dias = Math.floor(
        (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24),
      )
      await crearNotificacion({
        tipo: "pedido_estancado",
        datos: {
          numero: p.numero_tn || p.numero_interno || p.id.slice(0, 8),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cliente: (p.cliente as any)?.nombre || "",
          estado: p.estado_interno,
          dias,
        },
        recurso_id: p.id,
      })
    }
  }
}
