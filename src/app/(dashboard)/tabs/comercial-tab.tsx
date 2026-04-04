"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { ChartContainer } from "@/components/reportes/chart-container"
import { Skeleton } from "@/components/ui/skeleton"
import { getMetricasComerciales, getTopClientes, getTopProductos, getEvolucionMensual } from "@/lib/actions/reportes"
import { formatearMonto, calcularVariacion } from "@/lib/formatters"
import type { Period } from "@/components/reportes/period-selector"
import { getPeriodDates, getPreviousPeriodDates } from "@/components/reportes/period-selector"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts"

const COLORS = ["#378ADD", "#7F77DD"]

function formatMes(mes: string) {
  const [, month] = mes.split("-")
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return meses[parseInt(month) - 1]
}

export function ComercialTab({ period }: { period: Period }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metricas, setMetricas] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topClientes, setTopClientes] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topProductos, setTopProductos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evolucion, setEvolucion] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period)
      const { desde: desdeAnt } = getPreviousPeriodDates(period)
      const [m, tc, tp, ev] = await Promise.all([
        getMetricasComerciales(desde, hasta, desdeAnt),
        getTopClientes(desde, hasta),
        getTopProductos(desde, hasta),
        getEvolucionMensual(6),
      ])
      setMetricas(m); setTopClientes(tc); setTopProductos(tp); setEvolucion(ev)
      setLoading(false)
    }
    fetch()
  }, [period])

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  const varVentas = calcularVariacion(metricas.ventas, metricas.ventasAnt)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Ventas del período" value={formatearMonto(metricas.ventas)} trend={varVentas.trend} trendValue={`${varVentas.porcentaje}%`} />
        <MetricCard label="Pedidos" value={String(metricas.totalPedidos)} />
        <MetricCard label="Ticket promedio" value={formatearMonto(metricas.ticketPromedio)} />
        <MetricCard label="Clientes activos" value={String(metricas.clientesActivos)} subtitle={`${metricas.clientesNuevos} nuevos`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartContainer title="Evolución de facturación mensual">
          <LineChart data={evolucion.map((m) => ({ mes: formatMes(m.mes), Facturación: m.facturacion }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatearMonto(v)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(v) => formatearMonto(Number(v))} />
            <Line type="monotone" dataKey="Facturación" stroke="#378ADD" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ChartContainer>

        <ChartContainer title="Distribución por tipo de pedido">
          <PieChart>
            <Pie data={metricas.distribucion} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name"
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
              {metricas.distribucion.map((_: unknown, idx: number) => <Cell key={idx} fill={COLORS[idx]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Top 10 clientes por facturación">
          <ChartContainer title="" height={Math.max(200, topClientes.length * 32)}>
            <BarChart data={topClientes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatearMonto(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={130} />
              <Tooltip formatter={(v) => formatearMonto(Number(v))} />
              <Bar dataKey="facturado" fill="#378ADD" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </DashboardCard>

        <DashboardCard title="Top 10 productos más vendidos">
          <ChartContainer title="" height={Math.max(200, topProductos.length * 32)}>
            <BarChart data={topProductos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={150} />
              <Tooltip />
              <Bar dataKey="unidades" name="Unidades" fill="#639922" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </DashboardCard>
      </div>
    </div>
  )
}
