"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getMetricasStock } from "@/lib/actions/reportes"
import { formatearMonto } from "@/lib/formatters"
import { UNIDAD_INSUMO_CONFIG } from "@/lib/constants"
import type { UnidadInsumo } from "@/types/database"
import Link from "next/link"
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

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard
          label="Insumos stock crítico"
          value={String(data.stockCritico.length)}
          valueColor={data.stockCritico.length > 0 ? "text-red-600" : "text-green-600"}
        />
        <MetricCard label="Compras pendientes" value={String(data.comprasPendientes.length)} />
        <MetricCard label="Valor del inventario" value={formatearMonto(data.valorInventario)} subtitle="A costo unitario" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Insumos con stock crítico" description="Necesitan reposición urgente">
          {data.stockCritico.length > 0 ? (
            <div className="space-y-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.stockCritico.map((i: any) => {
                const unidad = UNIDAD_INSUMO_CONFIG[i.unidad as UnidadInsumo]
                return (
                  <KPIRow
                    key={i.id}
                    label={<Link href={`/insumos/${i.id}`} className="hover:underline">{i.nombre}</Link>}
                    value={
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        {Number(i.stock_actual).toLocaleString("es-AR")} {unidad?.short} (mín: {Number(i.stock_minimo).toLocaleString("es-AR")})
                      </Badge>
                    }
                  />
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Todos los insumos sobre mínimo</p>
          )}
        </DashboardCard>

        <DashboardCard title="Compras pendientes de recepción">
          {data.comprasPendientes.length > 0 ? (
            <div className="space-y-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.comprasPendientes.map((c: any) => (
                <KPIRow
                  key={c.id}
                  label={<Link href={`/compras/${c.id}`} className="hover:underline">{c.proveedor}</Link>}
                  value={
                    c.dias_atraso > 0 ? (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">{c.dias_atraso}d atraso</Badge>
                    ) : c.fecha_esperada ? (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.fecha_esperada), "dd/MM", { locale: es })}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500">{c.estado}</Badge>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin compras pendientes</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
