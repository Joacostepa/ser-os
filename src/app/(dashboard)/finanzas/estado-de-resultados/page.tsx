"use client"

import { useEffect, useState } from "react"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { PeriodSelector, getPeriodDates, type Period } from "@/components/reportes/period-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { getEstadoResultados } from "@/lib/actions/finanzas"
import { formatearMontoCompleto } from "@/lib/formatters"

export default function EstadoDeResultadosPage() {
  const [period, setPeriod] = useState<Period>("ultimos_30")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const { desde, hasta } = getPeriodDates(period)
        const result = await getEstadoResultados(desde, hasta)
        setData(result)
      } catch {
        setData(null)
      }
      setLoading(false)
    }
    fetch()
  }, [period])

  function pct(valor: number, base: number) {
    if (base === 0) return "—"
    return `${((valor / base) * 100).toFixed(1)}%`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Estado de resultados</h1>
          <p className="text-sm text-stone-400">Pérdidas y ganancias del período</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : data ? (
        <DashboardCard title="P&L">
          <div>
            {/* Ingresos */}
            <div className="mb-1">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Ventas netas</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.ingresos.map((cuenta: any) => (
                <KPIRow
                  key={cuenta.codigo}
                  label={
                    <span className="text-stone-500">
                      <span className="text-stone-400 text-xs mr-2">{cuenta.codigo}</span>
                      {cuenta.nombre}
                    </span>
                  }
                  value={
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-stone-700">{formatearMontoCompleto(cuenta.saldo)}</span>
                      <span className="text-xs text-stone-400 w-12 text-right">{pct(cuenta.saldo, data.totalIngresos)}</span>
                    </div>
                  }
                />
              ))}
              <KPIRow
                label="Total ventas netas"
                value={
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatearMontoCompleto(data.totalIngresos)}</span>
                    <span className="text-xs text-stone-400 w-12 text-right">100%</span>
                  </div>
                }
                bold
              />
            </div>

            {/* CMV */}
            <div className="mb-1 mt-4">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">(-) Costo de mercadería vendida</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.costos.map((cuenta: any) => (
                <KPIRow
                  key={cuenta.codigo}
                  label={
                    <span className="text-stone-500">
                      <span className="text-stone-400 text-xs mr-2">{cuenta.codigo}</span>
                      {cuenta.nombre}
                    </span>
                  }
                  value={
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-stone-700">{formatearMontoCompleto(cuenta.saldo)}</span>
                      <span className="text-xs text-stone-400 w-12 text-right">{pct(cuenta.saldo, data.totalIngresos)}</span>
                    </div>
                  }
                />
              ))}
              <KPIRow
                label="Total CMV"
                value={
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatearMontoCompleto(data.totalCostos)}</span>
                    <span className="text-xs text-stone-400 w-12 text-right">{pct(data.totalCostos, data.totalIngresos)}</span>
                  </div>
                }
                bold
              />
            </div>

            {/* Margen bruto */}
            <div className="mt-4 mb-4 py-3 px-4 -mx-4 bg-stone-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-800">= Margen bruto</span>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-base font-medium ${data.margenBruto >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatearMontoCompleto(data.margenBruto)}
                  </span>
                  <span className="text-xs text-stone-500 w-12 text-right">{data.margenPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Gastos operativos */}
            <div className="mb-1">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">(-) Gastos operativos</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.gastos.map((cuenta: any) => (
                <KPIRow
                  key={cuenta.codigo}
                  label={
                    <span className="text-stone-500">
                      <span className="text-stone-400 text-xs mr-2">{cuenta.codigo}</span>
                      {cuenta.nombre}
                    </span>
                  }
                  value={
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-stone-700">{formatearMontoCompleto(cuenta.saldo)}</span>
                      <span className="text-xs text-stone-400 w-12 text-right">{pct(cuenta.saldo, data.totalIngresos)}</span>
                    </div>
                  }
                />
              ))}
              <KPIRow
                label="Total gastos operativos"
                value={
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatearMontoCompleto(data.totalGastos)}</span>
                    <span className="text-xs text-stone-400 w-12 text-right">{pct(data.totalGastos, data.totalIngresos)}</span>
                  </div>
                }
                bold
              />
            </div>

            {/* Resultado operativo */}
            <div className="mt-4 py-4 px-4 -mx-4 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-stone-900">= Resultado operativo</span>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xl font-medium ${data.resultado >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatearMontoCompleto(data.resultado)}
                  </span>
                  <span className="text-sm text-stone-500 w-12 text-right">{data.resultadoPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">Error al cargar el estado de resultados</p>
      )}
    </div>
  )
}
