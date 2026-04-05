import { getProveedor } from "@/lib/actions/proveedores"
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
import { ArrowLeft, Mail, Phone, MapPin, Clock, Star } from "lucide-react"
import { CALIFICACION_PROVEEDOR_CONFIG, RUBRO_PROVEEDOR_CONFIG, ESTADO_COMPRA_CONFIG, CONDICION_FISCAL_CONFIG } from "@/lib/constants"
import { CondicionFiscalBadge } from "@/components/shared/condicion-fiscal-badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import type { CalificacionProveedor, EstadoCompra, RubroProveedor } from "@/types/database"

export default async function ProveedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const proveedor = await getProveedor(id)

  const rubroConfig = RUBRO_PROVEEDOR_CONFIG[proveedor.rubro as RubroProveedor]
  const califConfig = CALIFICACION_PROVEEDOR_CONFIG[proveedor.calificacion as CalificacionProveedor]

  const totalPagado = proveedor.pagos?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, p: any) => sum + Number(p.monto || 0),
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/proveedores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{proveedor.nombre}</h1>
            <Badge variant="secondary" className={rubroConfig?.color}>
              {rubroConfig?.label}
            </Badge>
            <Badge variant="secondary" className={califConfig?.color}>
              {califConfig?.label}
            </Badge>
            <CondicionFiscalBadge condicion={proveedor.condicion_fiscal} />
            {!proveedor.activo && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inactivo</Badge>
            )}
          </div>
          {proveedor.contacto_principal && proveedor.contacto_principal !== proveedor.nombre && (
            <p className="text-sm text-muted-foreground">Contacto: {proveedor.contacto_principal}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proveedor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {proveedor.email}
              </div>
            )}
            {proveedor.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {proveedor.telefono}
              </div>
            )}
            {proveedor.direccion && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {proveedor.direccion}
              </div>
            )}
            {proveedor.tiempo_entrega_dias && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Entrega: {proveedor.tiempo_entrega_dias} días
              </div>
            )}
            {proveedor.cuit && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-medium text-muted-foreground w-4">CUIT</span>
                <span className="font-mono text-xs">{proveedor.cuit}</span>
              </div>
            )}
            {proveedor.condiciones_pago && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                {proveedor.condiciones_pago}
              </div>
            )}
            {!proveedor.email && !proveedor.telefono && !proveedor.direccion && (
              <p className="text-sm text-muted-foreground">Sin datos de contacto</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Productos / Insumos</p>
            <p className="text-2xl font-bold">{proveedor.proveedores_productos?.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Total pagado</p>
            <p className="text-2xl font-bold">
              ${totalPagado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {proveedor.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{proveedor.notas}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos / Insumos que provee</CardTitle>
        </CardHeader>
        <CardContent>
          {proveedor.proveedores_productos?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Producto vinculado</TableHead>
                  <TableHead className="text-right">Precio ref.</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {proveedor.proveedores_productos.map((pp: any) => (
                  <TableRow key={pp.id}>
                    <TableCell className="font-medium">{pp.descripcion}</TableCell>
                    <TableCell>
                      {pp.producto ? (
                        <Link href={`/productos/${pp.producto.id}`} className="hover:underline text-blue-600">
                          {pp.producto.nombre}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pp.precio_referencia
                        ? `$${Number(pp.precio_referencia).toLocaleString("es-AR")} ${pp.moneda}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {pp.ultima_compra
                        ? format(new Date(pp.ultima_compra), "dd/MM/yyyy", { locale: es })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {pp.notas || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay productos registrados</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Órdenes de compra</CardTitle>
        </CardHeader>
        <CardContent>
          {proveedor.compras?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha pedido</TableHead>
                  <TableHead>Entrega esperada</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {proveedor.compras.map((compra: any) => {
                  const estadoConfig = ESTADO_COMPRA_CONFIG[compra.estado as EstadoCompra]
                  return (
                    <TableRow key={compra.id}>
                      <TableCell>
                        <Link href={`/compras/${compra.id}`} className="font-medium font-mono hover:underline">
                          {compra.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={estadoConfig?.color}>
                          {estadoConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {compra.pedido ? (
                          <Link href={`/pedidos/${compra.pedido.id}`} className="hover:underline text-blue-600">
                            #{compra.pedido.numero_tn || compra.pedido.id.slice(0, 8)}
                          </Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(compra.fecha_pedido), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {compra.fecha_esperada
                          ? format(new Date(compra.fecha_esperada), "dd/MM/yyyy", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell>{compra.items?.[0]?.count ?? 0}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay compras registradas</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {proveedor.pagos?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {proveedor.pagos.map((pago: any) => (
                  <TableRow key={pago.id}>
                    <TableCell>
                      {format(new Date(pago.fecha), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="capitalize">{pago.concepto?.replace(/_/g, " ")}</TableCell>
                    <TableCell>{pago.metodo}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      ${Number(pago.monto).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {pago.notas || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay pagos registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
