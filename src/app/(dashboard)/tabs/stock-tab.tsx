"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMetricasStock } from "@/lib/actions/reportes"
import { formatearMonto } from "@/lib/formatters"
import { UNIDAD_INSUMO_CONFIG, ESTADO_COMPRA_CONFIG } from "@/lib/constants"
import type { UnidadInsumo } from "@/types/database"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function StockTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const d = await getMetricasStock()
      setData(d)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Stock critico"
          value={String(data.stockCritico.length)}
          valueColor={data.stockCritico.length > 0 ? "text-red-600" : "text-green-600"}
          subtitle={data.stockCritico.length > 0 ? "Necesitan reposicion" : "Todo OK"}
        />
        <MetricCard
          label="Compras pendientes"
          value={String(data.comprasPendientes.length)}
          subtitle={data.comprasMontoTotal > 0 ? formatearMonto(data.comprasMontoTotal) : undefined}
        />
        <MetricCard
          label="Deuda proveedores"
          value={formatearMonto(data.deudaProveedores)}
          valueColor={data.deudaProveedores > 0 ? "text-amber-600" : ""}
        />
        <MetricCard
          label="Valor inventario"
          value={formatearMonto(data.valorInventario)}
          subtitle="A costo unitario"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insumos criticos */}
        <DashboardCard title="Insumos con stock critico" description="Necesitan reposicion urgente">
          {data.stockCritico.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Minimo</TableHead>
                  <TableHead className="text-right">Dif.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.stockCritico.map((i: any) => {
                  const unidad = UNIDAD_INSUMO_CONFIG[i.unidad as UnidadInsumo]
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link href={`/insumos/${i.id}`} className="font-medium hover:underline">{i.nombre}</Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(i.stock_actual).toLocaleString("es-AR")} {unidad?.short}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-stone-400">
                        {Number(i.stock_minimo).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600 font-medium">
                        {i.diferencia}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/compras/nueva?insumo=${i.id}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                          Crear OC &rarr;
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Todos los insumos sobre minimo</p>
          )}
        </DashboardCard>

        {/* Compras pendientes */}
        <DashboardCard title="Compras pendientes de recepcion">
          {data.comprasPendientes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OC #</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Entrega</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.comprasPendientes.map((c: any) => {
                  const estadoConfig = ESTADO_COMPRA_CONFIG[c.estado as keyof typeof ESTADO_COMPRA_CONFIG]
                  const atrasada = c.dias_atraso > 0
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/compras/${c.id}`} className="font-mono hover:underline">
                          {c.numero_orden || c.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{c.proveedor}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={estadoConfig?.color || "bg-gray-100 text-gray-500"}>
                          {estadoConfig?.label || c.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right text-xs ${atrasada ? "text-red-600 font-medium" : "text-stone-500"}`}>
                        {atrasada
                          ? `${c.dias_atraso}d atraso`
                          : c.fecha_esperada
                            ? format(new Date(c.fecha_esperada), "dd/MM", { locale: es })
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatearMonto(c.monto)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin compras pendientes</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
