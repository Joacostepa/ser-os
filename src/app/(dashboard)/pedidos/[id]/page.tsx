import { getPedido } from "@/lib/actions/pedidos"
import { PedidoDetailView } from "./pedido-detail-view"

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pedido = await getPedido(id)

  return <PedidoDetailView pedido={pedido} />
}
