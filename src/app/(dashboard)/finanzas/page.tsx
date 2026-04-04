"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { PeriodSelector, getPeriodDates, type Period } from "@/components/reportes/period-selector"
import { formatearMonto, formatearMontoCompleto } from "@/lib/formatters"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardFinanciero } from "@/lib/actions/finanzas"
import Link from "next/link"

export default function FinanzasDashboardPage() {
  const [period, setPeriod] = useState<Period>("last_30_days")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const { desde, hasta } = getPeriodDates(period)
        const result = await getDashboardFinanciero(desde, hasta)
        setData(result)
      } catch {
        setData(null)
      }
      setLoading(false)
    }
    fetch()
  }, [period])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Finanzas</h1>
          <p className="text-sm text-stone-400">Resumen financiero del negocio</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total a cobrar"
              value={formatearMonto(data.totalACobrar)}
              valueColor={data.totalACobrar > 0 ? "text-amber-600" : "text-stone-900"}
              subtitle={`${data.topCobros?.length || 0} pedidos pendientes`}
            />
            <MetricCard
              label="Total a pagar"
              value={formatearMonto(data.totalAPagar)}
              subtitle={`${data.comprasPendientes} compras pendientes`}
            />
            <MetricCard
              label="Resultado del mes"
              value={formatearMonto(data.resultado)}
              valueColor={data.resultado >= 0 ? "text-green-700" : "text-red-600"}
              subtitle={`${data.resultadoPct.toFixed(1)}% s/ ventas`}
            />
            <MetricCard
              label="Flujo de caja"
              value={formatearMonto(data.flujoCaja)}
              valueColor={data.flujoCaja >= 0 ? "text-green-700" : "text-red-600"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DashboardCard title="Cobros pendientes" description="Top 5 por antigüedad">
              {data.topCobros && data.topCobros.length > 0 ? (
                <div className="space-y-0">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {data.topCobros.map((cobro: any) => (
                    <Link
                      key={cobro.id}
                      href={`/pedidos/${cobro.id}`}
                      className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0 hover:bg-stone-50 -mx-5 px-5 transition-colors"
                    >
                      <div>
                        <p className="text-sm text-stone-800">
                          {cobro.numero_tn || `#${cobro.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-stone-400">{cobro.cliente} &middot; {cobro.dias}d</p>
                      </div>
                      <span className="text-sm font-mono text-red-600">
                        {formatearMontoCompleto(cobro.saldo)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400 text-center py-6">Sin cobros pendientes</p>
              )}
            </DashboardCard>

            <DashboardCard title="Mini estado de resultados">
              <div>
                <KPIRow label="Ventas netas" value={<span className="font-mono">{formatearMontoCompleto(data.ventasNetas)}</span>} />
                <KPIRow label="(-) Costo mercadería" value={<span className="font-mono">{formatearMontoCompleto(data.cmv)}</span>} />
                <KPIRow
                  label="= Margen bruto"
                  value={
                    <span className={`font-mono ${data.margenBruto >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatearMontoCompleto(data.margenBruto)} ({data.margenPct.toFixed(1)}%)
                    </span>
                  }
                  bold
                />
                <KPIRow label="(-) Gastos operativos" value={<span className="font-mono">{formatearMontoCompleto(data.gastosOperativos)}</span>} />
                <KPIRow
                  label="= Resultado"
                  value={
                    <span className={`font-mono ${data.resultado >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatearMontoCompleto(data.resultado)} ({data.resultadoPct.toFixed(1)}%)
                    </span>
                  }
                  bold
                />
              </div>
            </DashboardCard>
          </div>
        </>
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">Error al cargar los datos financieros</p>
      )}
    </div>
  )
}
