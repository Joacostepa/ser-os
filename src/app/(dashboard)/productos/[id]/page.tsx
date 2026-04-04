import { getProducto } from "@/lib/actions/productos"
import { getRecetaByProducto } from "@/lib/actions/recetas"
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
import { CanalBadge } from "@/components/shared/canal-badge"
import { ArrowLeft, Package } from "lucide-react"
import Link from "next/link"
import { RecetaEditor } from "./receta-editor"

export default async function ProductoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [producto, receta] = await Promise.all([
    getProducto(id),
    getRecetaByProducto(id),
  ])

  const totalStock = producto.variantes?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, v: any) => sum + (v.stock_actual || 0),
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/productos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{producto.nombre}</h1>
            <Badge variant="outline" className={producto.tipo === "personalizable" ? "border-purple-300 text-purple-700" : ""}>
              {producto.tipo === "estandar" ? "Estándar" : "Personalizable"}
            </Badge>
          </div>
          {producto.sku && (
            <p className="text-sm text-muted-foreground">SKU: {producto.sku}</p>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Stock total</p>
            <p className={`text-2xl font-bold ${totalStock === 0 ? "text-red-600" : ""}`}>
              {totalStock}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Precio mayorista</p>
            <p className="text-2xl font-bold">
              {producto.precio_mayorista
                ? `$${Number(producto.precio_mayorista).toLocaleString("es-AR")}`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Costo base</p>
            <p className="text-2xl font-bold">
              {producto.costo_base
                ? `$${Number(producto.costo_base).toLocaleString("es-AR")}`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Publicado en</p>
            <div className="flex gap-1 mt-1">
              {producto.productos_tienda?.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                producto.productos_tienda.map((pt: any) => (
                  <CanalBadge key={pt.tienda_id} canal={pt.tienda?.canal} />
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Ninguna tienda</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Variantes ({producto.variantes?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {producto.variantes?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variante</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Tiendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {producto.variantes.map((v: any) => {
                  const disponible = (v.stock_actual || 0) - (v.stock_reservado || 0)
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{v.sku || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.stock_actual || 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.stock_reservado || 0}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${disponible <= 0 ? "text-red-600" : ""}`}>
                        {disponible}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.precio ? `$${Number(v.precio).toLocaleString("es-AR")}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.costo ? `$${Number(v.costo).toLocaleString("es-AR")}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {v.variantes_tienda?.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            v.variantes_tienda.map((vt: any) => (
                              <div key={vt.tienda_id} className="flex items-center gap-1">
                                <CanalBadge canal={vt.tienda?.canal} />
                                {vt.stock_tn != null && (
                                  <span className="text-xs text-muted-foreground">({vt.stock_tn})</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay variantes</p>
          )}
        </CardContent>
      </Card>

      <RecetaEditor
        productoId={producto.id}
        productoNombre={producto.nombre}
        precioMayorista={producto.precio_mayorista}
        recetaActual={receta}
      />
    </div>
  )
}
