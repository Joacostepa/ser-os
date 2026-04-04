import { getCompraDetalle } from "@/lib/actions/compras"
import { CompraDetailView } from "./compra-detail-view"

export default async function CompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const compra = await getCompraDetalle(id)

  return <CompraDetailView compra={compra} />
}
