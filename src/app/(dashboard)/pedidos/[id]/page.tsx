import { getPedido } from "@/lib/actions/pedidos"
import { PedidoDetail } from "@/components/pedidos/pedido-detail"

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pedido = await getPedido(id)

  return <PedidoDetail pedido={pedido} />
}
