"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { AlertItem } from "@/components/reportes/alert-item"
import { FunnelBar } from "@/components/reportes/funnel-bar"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { Skeleton } from "@/components/ui/skeleton"
import { getResumenGeneral, getAlertasActivas, getEmbudoPedidos, getUltimasAcciones } from "@/lib/actions/reportes"
import { formatearMonto, calcularVariacion, formatearTiempoRelativo } from "@/lib/formatters"
import type { Period } from "@/components/reportes/period-selector"
import { getPeriodDates, getPreviousPeriodDates } from "@/components/reportes/period-selector"

export function GeneralTab({ period }: { period: Period }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resumen, setResumen] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alertas, setAlertas] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [embudo, setEmbudo] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [acciones, setAcciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period)
      const { desde: desdeAnt } = getPreviousPeriodDates(period)
      const [r, a, e, ac] = await Promise.all([
        getResumenGeneral(desde, hasta, desdeAnt),
        getAlertasActivas(),
        getEmbudoPedidos(),
        getUltimasAcciones(),
      ])
      setResumen(r); setAlertas(a); setEmbudo(e); setAcciones(ac)
      setLoading(false)
    }
    fetch()
  }, [period])

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  const variacion = calcularVariacion(resumen.facturacion, resumen.facturacionAnterior)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Facturación del período"
          value={formatearMonto(resumen.facturacion)}
          subtitle={resumen.facturacionUsd > 0 ? `US$${formatearMonto(resumen.facturacionUsd).slice(1)}` : undefined}
          trend={variacion.trend}
          trendValue={`${variacion.porcentaje}%`}
        />
        <MetricCard
          label="Pedidos del período"
          value={String(resumen.totalPedidos)}
          subtitle={`Ticket prom: ${formatearMonto(resumen.ticketPromedio)}`}
        />
        <MetricCard
          label="Pedidos bloqueados"
          value={String(resumen.pedidosBloqueados)}
          valueColor={resumen.pedidosBloqueados > 0 ? "text-red-600" : ""}
        />
        <MetricCard
          label="Cobros pendientes"
          value={formatearMonto(resumen.totalDeuda)}
          subtitle={`${resumen.pedidosConDeuda} pedidos con saldo`}
          valueColor={resumen.totalDeuda > 0 ? "text-amber-600" : ""}
        />
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <DashboardCard title="Alertas activas">
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <AlertItem key={i} type={a.type} text={a.text} href={a.href} />
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Embudo + Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Embudo de pedidos activos" description="Dónde están parados los pedidos hoy">
          <div className="space-y-2">
            {embudo.map((e) => (
              <FunnelBar key={e.estado} label={e.label} value={e.value} width={e.width} color={e.color} />
            ))}
            {embudo.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin pedidos activos</p>}
          </div>
        </DashboardCard>

        <DashboardCard title="Últimas acciones">
          <div className="space-y-2">
            {acciones.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-muted last:border-0">
                <span className="text-sm truncate flex-1 mr-2">{a.texto}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatearTiempoRelativo(a.fecha)}</span>
              </div>
            ))}
            {acciones.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente</p>}
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
