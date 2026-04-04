"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getMetricasOperativas, getRendimientoEquipo, getEmbudoPedidos } from "@/lib/actions/reportes"
import { FunnelBar } from "@/components/reportes/funnel-bar"
import type { Period } from "@/components/reportes/period-selector"
import { getPeriodDates } from "@/components/reportes/period-selector"

export function OperativoTab({ period }: { period: Period }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metricas, setMetricas] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [equipo, setEquipo] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [embudo, setEmbudo] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period)
      const [m, e, emb] = await Promise.all([
        getMetricasOperativas(desde, hasta),
        getRendimientoEquipo(desde, hasta),
        getEmbudoPedidos(),
      ])
      setMetricas(m); setEquipo(e); setEmbudo(emb)
      setLoading(false)
    }
    fetch()
  }, [period])

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Tareas completadas hoy"
          value={String(metricas.tareasCompletadasHoy)}
          subtitle={`de ${metricas.tareasAsignadasHoy} asignadas`}
        />
        <MetricCard label="Pedidos en embudo" value={String(embudo.reduce((s: number, e: { value: number }) => s + e.value, 0))} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Embudo de pedidos activos" description="Dónde están parados los pedidos hoy">
          <div className="space-y-2">
            {embudo.map((e) => (
              <FunnelBar key={e.estado} label={e.label} value={e.value} width={e.width} color={e.color} />
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Rendimiento del equipo" description="Tareas completadas vs asignadas (período)">
          <div className="space-y-1">
            {equipo.map((r) => {
              const badgeColor = r.porcentaje >= 80 ? "bg-green-100 text-green-700"
                : r.porcentaje >= 60 ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
              return (
                <KPIRow
                  key={r.nombre}
                  label={r.nombre}
                  value={
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{r.completadas}/{r.total}</span>
                      <Badge variant="secondary" className={badgeColor}>{r.porcentaje}%</Badge>
                    </div>
                  }
                />
              )
            })}
            {equipo.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin datos de equipo</p>}
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
