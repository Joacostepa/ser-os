import { getPedido } from "@/lib/actions/pedidos"
import { PedidoDetailView } from "./pedido-detail-view"
import { createClient } from "@/lib/supabase/server"

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [pedido, userRol] = await Promise.all([
    getPedido(id),
    (async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return "viewer"
      const { data } = await supabase.from("usuarios").select("rol").eq("auth_id", user.id).single()
      return data?.rol || "viewer"
    })(),
  ])

  return <PedidoDetailView pedido={pedido} userRol={userRol} />
}
