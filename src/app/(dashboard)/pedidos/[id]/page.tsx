import { getPedido } from "@/lib/actions/pedidos"
import { PedidoDetailView } from "./pedido-detail-view"
import { notFound } from "next/navigation"

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let pedido
  try {
    pedido = await getPedido(id)
  } catch {
    notFound()
  }

  return <PedidoDetailView pedido={pedido} />
}
