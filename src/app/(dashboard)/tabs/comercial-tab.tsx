"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { ChartContainer } from "@/components/reportes/chart-container"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMetricasComerciales, getTopClientes, getTopProductos, getEvolucionMensual } from "@/lib/actions/reportes"
import { formatearMonto, calcularVariacion } from "@/lib/formatters"
import { getPeriodDates, getPreviousPeriodDates, type Period } from "@/components/reportes/period-selector"
import { type Moneda } from "@/components/reportes/moneda-toggle"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer } from "recharts"

const TIPO_COLORS: Record<string, string> = {
  logo_ser: "#378ADD",
  marca_blanca: "#9CA3AF",
  personalizado: "#7F77DD",
  sin_clasificar: "#F59E0B",
}

const CANAL_COLORS: Record<string, string> = {
  tienda_nube: "#378ADD",
  whatsapp: "#25D366",
  telefono: "#8B5CF6",
  presencial: "#F59E0B",
  otro: "#9CA3AF",
}

function formatMes(mes: string) {
  const [, month] = mes.split("-")
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return meses[parseInt(month) - 1]
}

export function ComercialTab({
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
      const { desde, hasta } = getPeriodDates(period, customDesde, customHasta)
      const { desde: desdeAnt } = getPreviousPeriodDates(period, customDesde, customHasta)
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
  }, [period, customDesde, customHasta])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const varVentas = calcularVariacion(metricas.ventas, metricas.ventasAnt)
  const varPedidos = calcularVariacion(metricas.totalPedidos, metricas.totalPedidosAnt)

  // Horizontal bar data for tipo distribution
  const tipoData = metricas.distribucionTipo.filter((d: { value: number }) => d.value > 0)
  const maxTipo = Math.max(...tipoData.map((d: { value: number }) => d.value), 1)

  // Horizontal bar data for canal distribution
  const canalData = metricas.distribucionCanal.filter((d: { value: number }) => d.value > 0)
  const maxCanal = Math.max(...canalData.map((d: { value: number }) => d.value), 1)

  // Evolution chart data with USD
  const chartData = evolucion.map((m) => ({
    mes: formatMes(m.mes),
    Neto: m.facturacion,
    USD: m.usd,
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Ventas netas"
          value={formatearMonto(metricas.ventas)}
          usdValue={moneda === "USD" && metricas.ventasUsd > 0 ? `US$ ${formatearMonto(metricas.ventasUsd).slice(1)}` : undefined}
          trend={varVentas.trend}
          trendValue={`${varVentas.porcentaje}%`}
        />
        <MetricCard
          label="Pedidos"
          value={String(metricas.totalPedidos)}
          trend={varPedidos.trend}
          trendValue={`${varPedidos.porcentaje}%`}
        />
        <MetricCard
          label="Ticket promedio"
          value={formatearMonto(metricas.ticketPromedio)}
        />
        <MetricCard
          label="Clientes activos"
          value={String(metricas.clientesActivos)}
          subtitle={`${metricas.clientesNuevos} nuevos`}
        />
      </div>

      {/* Charts: Evolucion + Distribuciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartContainer title="Evolucion de facturacion mensual">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tickFormatter={(v) => formatearMonto(v)} tick={{ fontSize: 11 }} width={70} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `US$${v > 0 ? formatearMonto(v).slice(1) : "0"}`} tick={{ fontSize: 11 }} width={70} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any, name: any) => String(name) === "USD" ? `US$ ${Number(v).toLocaleString("es-AR")}` : formatearMonto(Number(v))} />
            <Line yAxisId="left" type="monotone" dataKey="Neto" stroke="#378ADD" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="USD" stroke="#22C55E" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ChartContainer>

        <DashboardCard title="Distribucion por tipo de pedido">
          <div className="space-y-2">
            {tipoData.map((d: { name: string; key: string; value: number }) => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-28 shrink-0 text-right truncate">{d.name}</span>
                <div className="flex-1">
                  <div
                    className="h-7 rounded-md flex items-center px-2.5"
                    style={{
                      width: `${Math.max((d.value / maxTipo) * 100, 8)}%`,
                      backgroundColor: TIPO_COLORS[d.key] || "#9CA3AF",
                    }}
                  >
                    <span className="text-xs font-medium text-white">{d.value}</span>
                  </div>
                </div>
              </div>
            ))}
            {tipoData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Canal distribution */}
      <DashboardCard title="Distribucion por canal">
        <div className="space-y-2">
          {canalData.map((d: { name: string; key: string; value: number }) => (
            <div key={d.key} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-28 shrink-0 text-right truncate">{d.name}</span>
              <div className="flex-1">
                <div
                  className="h-7 rounded-md flex items-center px-2.5"
                  style={{
                    width: `${Math.max((d.value / maxCanal) * 100, 8)}%`,
                    backgroundColor: CANAL_COLORS[d.key] || "#9CA3AF",
                  }}
                >
                  <span className="text-xs font-medium text-white">{d.value}</span>
                </div>
              </div>
            </div>
          ))}
          {canalData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          )}
        </div>
      </DashboardCard>

      {/* Top clientes + Top productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Top 10 clientes por facturacion">
          {topClientes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                  <TableHead className="text-right">Ticket prom.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {topClientes.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.pedidos}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearMonto(c.facturado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearMonto(c.ticketPromedio)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          )}
        </DashboardCard>

        <DashboardCard title="Top 10 productos mas vendidos">
          {topProductos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {topProductos.map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.unidades}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.facturado ? formatearMonto(p.facturado) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
