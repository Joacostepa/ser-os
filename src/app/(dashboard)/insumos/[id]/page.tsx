import { getInsumo } from "@/lib/actions/insumos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Package, AlertTriangle, Truck, DollarSign } from "lucide-react"
import { TIPO_INSUMO_CONFIG, UNIDAD_INSUMO_CONFIG, TIPO_MOVIMIENTO_CONFIG } from "@/lib/constants"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import type { TipoInsumo, UnidadInsumo, TipoMovimientoStock } from "@/types/database"
import { AjusteStock } from "./ajuste-stock"

export default async function InsumoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const insumo = await getInsumo(id)

  const tipoConfig = TIPO_INSUMO_CONFIG[insumo.tipo as TipoInsumo]
  const unidadConfig = UNIDAD_INSUMO_CONFIG[insumo.unidad as UnidadInsumo]
  const bajoStock = insumo.tipo === "material" &&
    Number(insumo.stock_actual) <= Number(insumo.stock_minimo) &&
    Number(insumo.stock_minimo) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/insumos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{insumo.nombre}</h1>
            <Badge variant="secondary" className={tipoConfig?.color}>{tipoConfig?.label}</Badge>
            {bajoStock && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <AlertTriangle className="h-3 w-3 mr-1" /> Stock bajo
              </Badge>
            )}
            {!insumo.activo && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inactivo</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {insumo.tipo === "material" && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                Stock actual
              </div>
              <p className={`text-2xl font-bold ${bajoStock ? "text-amber-600" : ""}`}>
                {Number(insumo.stock_actual).toLocaleString("es-AR")} {unidadConfig?.short}
              </p>
              <p className="text-xs text-muted-foreground">
                Mínimo: {Number(insumo.stock_minimo).toLocaleString("es-AR")} {unidadConfig?.short}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Costo unitario
            </div>
            <p className="text-2xl font-bold">
              ${Number(insumo.costo_unitario).toLocaleString("es-AR")}
            </p>
            <p className="text-xs text-muted-foreground">por {unidadConfig?.label?.toLowerCase()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Truck className="h-4 w-4" />
              Proveedor
            </div>
            {insumo.proveedor ? (
              <Link href={`/proveedores/${insumo.proveedor.id}`} className="text-lg font-bold hover:underline">
                {insumo.proveedor.nombre}
              </Link>
            ) : (
              <p className="text-lg font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {insumo.unidad_compra && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">Fraccionamiento</p>
              <p className="text-lg font-bold">{insumo.unidad_compra}</p>
              <p className="text-xs text-muted-foreground">
                Rinde {Number(insumo.rendimiento).toLocaleString("es-AR")} {unidadConfig?.short} c/u
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {insumo.notas && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{insumo.notas}</p>
          </CardContent>
        </Card>
      )}

      {insumo.tipo === "material" && (
        <AjusteStock insumoId={insumo.id} unidadShort={unidadConfig?.short || "u"} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos de stock</CardTitle>
        </CardHeader>
        <CardContent>
          {insumo.movimientos?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Stock ant.</TableHead>
                  <TableHead className="text-right">Stock post.</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {insumo.movimientos.map((mov: any) => {
                  const movConfig = TIPO_MOVIMIENTO_CONFIG[mov.tipo as TipoMovimientoStock]
                  return (
                    <TableRow key={mov.id}>
                      <TableCell className="tabular-nums">
                        {format(new Date(mov.created_at), "dd/MM/yy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={movConfig?.color}>
                          {movConfig?.sign} {movConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {Number(mov.cantidad).toLocaleString("es-AR")} {unidadConfig?.short}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {Number(mov.stock_anterior).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(mov.stock_posterior).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {mov.referencia_tipo?.replace(/_/g, " ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {mov.notas || "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay movimientos registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
