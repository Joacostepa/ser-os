import { getCompra } from "@/lib/actions/compras"
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
import { ArrowLeft, Package, Truck, FileText, Calendar, DollarSign } from "lucide-react"
import { ESTADO_COMPRA_CONFIG } from "@/lib/constants"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import type { EstadoCompra } from "@/types/database"
import { CompraActions } from "./compra-actions"

export default async function CompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const compra = await getCompra(id)

  const estadoConfig = ESTADO_COMPRA_CONFIG[compra.estado as EstadoCompra]

  const totalItems = compra.items?.length ?? 0
  const itemsRecibidos = compra.items?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i: any) => i.cantidad_recibida >= i.cantidad
  ).length ?? 0

  const montoTotal = compra.items?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, i: any) => sum + Number(i.subtotal || 0),
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/compras">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Compra #{compra.id.slice(0, 8)}
              </h1>
              <Badge variant="secondary" className={estadoConfig?.color}>
                {estadoConfig?.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Creada el {format(new Date(compra.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>
        <CompraActions compraId={compra.id} estadoActual={compra.estado} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Truck className="h-4 w-4" />
              Proveedor
            </div>
            <Link
              href={`/proveedores/${compra.proveedor?.id}`}
              className="text-lg font-bold hover:underline"
            >
              {compra.proveedor?.nombre}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              Pedido vinculado
            </div>
            {compra.pedido ? (
              <Link
                href={`/pedidos/${compra.pedido.id}`}
                className="text-lg font-bold hover:underline"
              >
                #{compra.pedido.numero_tn || compra.pedido.id.slice(0, 8)}
              </Link>
            ) : (
              <p className="text-lg font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              Recepción
            </div>
            <p className="text-lg font-bold">
              {itemsRecibidos}/{totalItems} items
            </p>
            {totalItems > 0 && (
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(itemsRecibidos / totalItems) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Monto total
            </div>
            <p className="text-lg font-bold">
              ${montoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            {compra.monto_total_usd && (
              <p className="text-xs text-green-700">
                US${Number(compra.monto_total_usd).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>

        {compra.cotizacion_usd && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Cotización
              </div>
              <p className="text-lg font-bold">
                ${Number(compra.cotizacion_usd).toLocaleString("es-AR")}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{compra.cotizacion_tipo}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {(compra.fecha_esperada || compra.fecha_recibida) && (
        <div className="flex gap-6 text-sm">
          {compra.fecha_esperada && (
            <div>
              <span className="text-muted-foreground">Entrega esperada: </span>
              <span className="font-medium">
                {format(new Date(compra.fecha_esperada), "dd/MM/yyyy", { locale: es })}
              </span>
            </div>
          )}
          {compra.fecha_recibida && (
            <div>
              <span className="text-muted-foreground">Recibida: </span>
              <span className="font-medium text-green-700">
                {format(new Date(compra.fecha_recibida), "dd/MM/yyyy", { locale: es })}
              </span>
            </div>
          )}
        </div>
      )}

      {compra.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{compra.notas}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items de la compra</CardTitle>
        </CardHeader>
        <CardContent>
          {compra.items?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {compra.items.map((item: any) => {
                  const completo = item.cantidad_recibida >= item.cantidad
                  const parcial = item.cantidad_recibida > 0 && !completo
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.descripcion}</TableCell>
                      <TableCell>
                        {item.producto ? (
                          <Link
                            href={`/productos/${item.producto.id}`}
                            className="hover:underline text-blue-600"
                          >
                            {item.producto.nombre}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.cantidad}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${Number(item.precio_unitario).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        ${Number(item.subtotal).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.cantidad_recibida}/{item.cantidad}
                      </TableCell>
                      <TableCell>
                        {completo ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">Completo</Badge>
                        ) : parcial ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">Parcial</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-500">Pendiente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay items</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
