"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getMetricasFinancieras } from "@/lib/actions/reportes"
import { formatearMonto } from "@/lib/formatters"
import type { Period } from "@/components/reportes/period-selector"
import { getPeriodDates } from "@/components/reportes/period-selector"

const FRANJA_COLORS: Record<string, string> = {
  "0-15 días": "bg-green-100 text-green-700",
  "16-30 días": "bg-amber-100 text-amber-700",
  "31-60 días": "bg-orange-100 text-orange-700",
  "60+ días": "bg-red-100 text-red-700",
}

export function FinancieroTab({ period }: { period: Period }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period)
      const d = await getMetricasFinancieras(desde, hasta)
      setData(d)
      setLoading(false)
    }
    fetch()
  }, [period])

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total a cobrar" value={formatearMonto(data.totalACobrar)}
          subtitle={`${data.pedidosConSaldo} pedidos con saldo`}
          valueColor={data.totalACobrar > 0 ? "text-amber-600" : ""} />
        <MetricCard label="Cobros del período" value={formatearMonto(data.totalCobros)} />
        <MetricCard label="Egresos del período" value={formatearMonto(data.totalEgresos)} />
        <MetricCard label="Flujo de caja" value={formatearMonto(data.flujoCaja)}
          valueColor={data.flujoCaja >= 0 ? "text-green-600" : "text-red-600"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Antigüedad de cuentas a cobrar">
          {data.antiguedad.some((a: { monto: number }) => a.monto > 0) ? (
            <div className="space-y-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.antiguedad.map((a: any) => (
                <KPIRow
                  key={a.franja}
                  label={a.franja}
                  value={
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{formatearMonto(a.monto)}</span>
                      <Badge variant="secondary" className={FRANJA_COLORS[a.franja] || ""}>
                        {a.porcentaje.toFixed(0)}%
                      </Badge>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin cuentas a cobrar pendientes</p>
          )}
        </DashboardCard>

        <DashboardCard title="Resumen financiero del período">
          <div className="space-y-1">
            <KPIRow label="Ingresos (cobros)" value={<span className="text-green-600">{formatearMonto(data.totalCobros)}</span>} />
            <KPIRow label="Egresos (proveedores + gastos)" value={<span className="text-red-600">-{formatearMonto(data.totalEgresos)}</span>} />
            <KPIRow label="Flujo neto" value={
              <span className={`font-semibold ${data.flujoCaja >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatearMonto(data.flujoCaja)}
              </span>
            } bold />
            <KPIRow label="Ratio cobros/ventas" value={
              <Badge variant="secondary" className={data.totalCobros > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}>
                {data.totalACobrar + data.totalCobros > 0
                  ? `${((data.totalCobros / (data.totalACobrar + data.totalCobros)) * 100).toFixed(0)}%`
                  : "—"}
              </Badge>
            } />
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
