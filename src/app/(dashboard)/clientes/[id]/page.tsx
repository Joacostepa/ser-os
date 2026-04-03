import { getCliente } from "@/lib/actions/clientes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Mail, Phone, FileText } from "lucide-react"
import { EstadoBadge } from "@/components/shared/status-badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

const CATEGORIA_BADGE: Record<string, string> = {
  nuevo: "bg-blue-100 text-blue-700",
  recurrente: "bg-green-100 text-green-700",
  vip: "bg-amber-100 text-amber-700",
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = await getCliente(id)

  const totalDeuda = cliente.pedidos?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, p: any) => sum + Number(p.saldo_pendiente || 0),
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <Badge variant="secondary" className={`capitalize ${CATEGORIA_BADGE[cliente.categoria] || ""}`}>
              {cliente.categoria}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {cliente.email}
              </div>
            )}
            {cliente.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {cliente.telefono}
              </div>
            )}
            {cliente.cuit && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                CUIT: {cliente.cuit}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Total pedidos</p>
            <p className="text-2xl font-bold">{cliente.pedidos?.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Deuda pendiente</p>
            <p className={`text-2xl font-bold ${totalDeuda > 0 ? "text-red-600" : "text-green-600"}`}>
              ${totalDeuda.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {cliente.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{cliente.notas}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {cliente.pedidos?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Pedido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {cliente.pedidos.map((pedido: any) => (
                  <TableRow key={pedido.id}>
                    <TableCell>
                      <Link href={`/pedidos/${pedido.id}`} className="font-medium hover:underline">
                        {pedido.numero_tn || `#${pedido.id.slice(0, 8)}`}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{pedido.tipo}</TableCell>
                    <TableCell>
                      <EstadoBadge estado={pedido.estado_interno} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${Number(pedido.monto_total).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${Number(pedido.saldo_pendiente) > 0 ? "text-red-600" : ""}`}>
                      ${Number(pedido.saldo_pendiente).toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay pedidos</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
