"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { PeriodSelector, getPeriodDates, type Period } from "@/components/reportes/period-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { getFlujoCaja } from "@/lib/actions/finanzas"
import { formatearMonto, formatearMontoCompleto } from "@/lib/formatters"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

export default function FlujoDeCajaPage() {
  const [period, setPeriod] = useState<Period>("ultimos_90")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const { desde, hasta } = getPeriodDates(period)
        const result = await getFlujoCaja(desde, hasta)
        setData(result)
      } catch {
        setData(null)
      }
      setLoading(false)
    }
    fetch()
  }, [period])

  function formatMesLabel(mes: string) {
    const [year, month] = mes.split("-")
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    return `${meses[parseInt(month) - 1]} ${year.slice(2)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Flujo de caja</h1>
          <p className="text-sm text-stone-400">Movimientos de efectivo del período</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Ingresos"
              value={formatearMonto(data.ingresos)}
              valueColor="text-green-700"
            />
            <MetricCard
              label="Egresos"
              value={formatearMonto(data.egresos)}
              valueColor="text-red-600"
            />
            <MetricCard
              label="Flujo neto"
              value={formatearMonto(data.flujoNeto)}
              valueColor={data.flujoNeto >= 0 ? "text-green-700" : "text-red-600"}
            />
          </div>

          <DashboardCard title="Ingresos vs Egresos por mes">
            {data.mensual && data.mensual.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.mensual.map((m: { mes: string; ingresos: number; egresos: number }) => ({
                      ...m,
                      label: formatMesLabel(m.mes),
                    }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#78716c" }}
                      axisLine={{ stroke: "#d6d3d1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#78716c" }}
                      axisLine={{ stroke: "#d6d3d1" }}
                      tickLine={false}
                      tickFormatter={(value: number) => formatearMonto(value)}
                    />
                    <Tooltip
                      formatter={(value) => formatearMontoCompleto(Number(value))}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #d6d3d1",
                        fontSize: "13px",
                        fontFamily: "var(--font-geist-mono)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", color: "#78716c" }}
                    />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="egresos" name="Egresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-stone-400 text-center py-12">Sin movimientos en el período</p>
            )}
          </DashboardCard>
        </>
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">Error al cargar el flujo de caja</p>
      )}
    </div>
  )
}
