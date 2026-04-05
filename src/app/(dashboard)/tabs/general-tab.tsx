"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { FunnelBar } from "@/components/reportes/funnel-bar"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { Skeleton } from "@/components/ui/skeleton"
import { getResumenGeneral, getAlertasActivas, getEmbudoPedidos, getUltimasAcciones } from "@/lib/actions/reportes"
import { formatearMonto, calcularVariacion, formatearTiempoRelativo } from "@/lib/formatters"
import { getPeriodDates, getPreviousPeriodDates, type Period } from "@/components/reportes/period-selector"
import { type Moneda } from "@/components/reportes/moneda-toggle"

const ACTION_EMOJI: Record<string, string> = {
  pago: "\u{1F4B3}",
  estado: "\u2705",
  creacion: "\u{1F4DD}",
}

export function GeneralTab({
  period,
  moneda,
  customDesde,
  customHasta,
}: {
  period: Period
  moneda: Moneda
  customDesde?: string
  customHasta?: string
}) {
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
    async function load() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period, customDesde, customHasta)
      const { desde: desdeAnt } = getPreviousPeriodDates(period, customDesde, customHasta)
      const [r, a, e, ac] = await Promise.all([
        getResumenGeneral(desde, hasta, desdeAnt),
        getAlertasActivas(),
        getEmbudoPedidos(),
        getUltimasAcciones(),
      ])
      setResumen(r)
      setAlertas(a)
      setEmbudo(Array.isArray(e) ? e : e?.embudo || [])
      setAcciones(ac)
      setLoading(false)
    }
    load()
  }, [period, customDesde, customHasta])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const variacion = calcularVariacion(resumen.facturacion, resumen.facturacionAnterior)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Facturación"
          value={formatearMonto(resumen.facturacion)}
          usdValue={moneda === "USD" && resumen.facturacionUsd > 0 ? `US$ ${formatearMonto(resumen.facturacionUsd).slice(1)}` : undefined}
          trend={variacion.trend}
          trendValue={`${variacion.porcentaje}%`}
        />
        <MetricCard
          label="Pedidos"
          value={String(resumen.totalPedidos)}
          subtitle={`Ticket prom: ${formatearMonto(resumen.ticketPromedio)}`}
        />
        <MetricCard
          label="Pedidos activos"
          value={String(resumen.pedidosActivosCount)}
          subtitle={`${resumen.enPrearmado} en pre-armado, ${resumen.enArmado} en armado`}
        />
        <MetricCard
          label="Cobros pendientes"
          value={formatearMonto(resumen.totalDeuda)}
          subtitle={`${resumen.pedidosConDeuda} pedidos con saldo`}
          valueColor={resumen.totalDeuda > 0 ? "text-red-600" : ""}
        />
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
          <h3 className="text-sm font-medium text-stone-800 mb-3">Alertas activas</h3>
          <div className="space-y-1.5">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    a.type === "red" ? "bg-red-500" : a.type === "amber" ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
                <span className="text-sm text-stone-700 flex-1">{a.text}</span>
                {a.href && (
                  <Link href={a.href} className="shrink-0 text-stone-400 hover:text-stone-600 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embudo + Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Embudo de pedidos activos" description="Donde estan parados los pedidos hoy">
          <div className="space-y-2">
            {embudo.map((e) => (
              <Link key={e.estado} href={`/pedidos?estado=${e.estado}`} className="block hover:opacity-80 transition-opacity">
                <FunnelBar label={e.label} value={e.value} width={e.width} color={e.color} />
              </Link>
            ))}
            {embudo.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin pedidos activos</p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Ultimas acciones">
          <div className="space-y-1">
            {acciones.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-base shrink-0">{ACTION_EMOJI[a.tipo] || "\u{1F4DD}"}</span>
                {a.numero && (
                  <span className="text-xs font-mono text-stone-500 shrink-0">#{a.numero}</span>
                )}
                <span className="text-sm text-stone-700 truncate flex-1">{a.texto}</span>
                <span className="text-xs text-stone-400 shrink-0">{formatearTiempoRelativo(a.fecha)}</span>
              </div>
            ))}
            {acciones.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente</p>
            )}
          </div>
          {acciones.length > 0 && (
            <div className="pt-3 mt-2 border-t border-stone-100">
              <Link href="/pedidos" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                Ver todo &rarr;
              </Link>
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
