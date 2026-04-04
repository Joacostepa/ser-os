"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/data-table"
import { CanalBadge } from "@/components/shared/canal-badge"
import { Search, Package } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const productosColumns: ColumnDef<any>[] = [
  {
    accessorKey: "nombre",
    header: "Producto",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.nombre}</span>
        {row.original.sku && (
          <span className="text-xs text-muted-foreground ml-2">SKU: {row.original.sku}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "categoria",
    header: "Categoría",
    cell: ({ row }) => row.original.categoria || "—",
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge variant="outline" className={row.original.tipo === "personalizable" ? "border-purple-300 text-purple-700" : ""}>
        {row.original.tipo === "estandar" ? "Estándar" : "Personalizable"}
      </Badge>
    ),
  },
  {
    accessorKey: "precio_mayorista",
    header: "Precio",
    cell: ({ row }) =>
      row.original.precio_mayorista
        ? `$${Number(row.original.precio_mayorista).toLocaleString("es-AR")}`
        : "—",
  },
  {
    accessorKey: "stock",
    header: "Stock total",
    cell: ({ row }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantes = row.original.variantes || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalStock = variantes.reduce((sum: number, v: any) => sum + (v.stock_actual || 0), 0)
      const isLow = totalStock <= (row.original.stock_minimo || 0) && totalStock > 0
      const isZero = totalStock === 0

      return (
        <span className={`tabular-nums font-medium ${isZero ? "text-red-600" : isLow ? "text-amber-600" : ""}`}>
          {totalStock}
          {isZero && <span className="text-xs ml-1">sin stock</span>}
          {isLow && !isZero && <span className="text-xs ml-1">bajo</span>}
        </span>
      )
    },
  },
  {
    accessorKey: "variantes",
    header: "Variantes",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cell: ({ row }) => (row.original.variantes as any[])?.length || 0,
  },
  {
    accessorKey: "tiendas",
    header: "Tiendas",
    cell: ({ row }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tiendas = row.original.productos_tienda || []
      if (tiendas.length === 0) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex gap-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tiendas.map((pt: any) => (
            <CanalBadge key={pt.tienda_id} canal={pt.tienda?.canal} />
          ))}
        </div>
      )
    },
  },
]

export default function ProductosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchProductos() {
      setLoading(true)
      let query = supabase
        .from("productos")
        .select(`
          *,
          variantes(id, nombre, sku, stock_actual, stock_reservado, precio, costo),
          productos_tienda(tienda_id, tienda_nube_product_id, publicado, tienda:tiendas(nombre, canal))
        `)
        .eq("activo", true)
        .order("nombre")

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,sku.ilike.%${busqueda}%`)
      }

      const { data } = await query
      setProductos(data || [])
      setLoading(false)
    }

    fetchProductos()
  }, [busqueda])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de productos sincronizado con Tienda Nube
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay productos</p>
            <p className="text-sm text-muted-foreground mt-1">
              Importá productos desde Configuración → Integración
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={productosColumns}
          data={productos}
          onRowClick={(row: { id: string }) => router.push(`/productos/${row.id}`)}
        />
      )}
    </div>
  )
}
