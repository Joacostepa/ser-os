"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { FunnelBar } from "@/components/reportes/funnel-bar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMetricasOperativas, getRendimientoEquipo, getEmbudoPedidos, getPedidosEstancados } from "@/lib/actions/reportes"
import { getPeriodDates, type Period } from "@/components/reportes/period-selector"
import { ESTADOS_INTERNOS } from "@/lib/constants"

export function OperativoTab({
  period,
  customDesde,
  customHasta,
}: {
  period: Period
  customDesde?: string
  customHasta?: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metricas, setMetricas] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [equipo, setEquipo] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [embudo, setEmbudo] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [estancados, setEstancados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period, customDesde, customHasta)
      const [m, e, emb, est] = await Promise.all([
        getMetricasOperativas(desde, hasta),
        getRendimientoEquipo(desde, hasta),
        getEmbudoPedidos(),
        getPedidosEstancados(5),
      ])
      setMetricas(m); setEquipo(e); setEmbudo(Array.isArray(emb) ? emb : emb?.embudo || []); setEstancados(est)
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
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Pasos completados hoy"
          value={String(metricas.pasosCompletadosHoy)}
        />
        <MetricCard
          label="Pasos pendientes"
          value={String(metricas.pasosPendientes)}
        />
        <MetricCard
          label="Pedidos estancados"
          value={String(metricas.pedidosEstancados)}
          valueColor={metricas.pedidosEstancados > 0 ? "text-red-600" : ""}
          subtitle={metricas.pedidosEstancados > 0 ? "Sin movimiento hace +5 dias" : "Todo al dia"}
        />
        <MetricCard
          label="Tiempo promedio entrega"
          value={metricas.tiempoPromedioEntrega > 0 ? `${metricas.tiempoPromedioEntrega} dias` : "—"}
          subtitle="Pedidos cerrados del periodo"
        />
      </div>

      {/* Embudo */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rendimiento equipo */}
        <DashboardCard title="Rendimiento del equipo" description="Tareas asignadas vs completadas (periodo)">
          {equipo.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-right">Asignados</TableHead>
                  <TableHead className="text-right">Completados</TableHead>
                  <TableHead className="text-right">Pendientes</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {equipo.map((r: any) => {
                  const badgeColor = r.porcentaje >= 80 ? "bg-green-100 text-green-700"
                    : r.porcentaje >= 60 ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                  return (
                    <TableRow key={r.nombre}>
                      <TableCell className="font-medium">{r.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.completadas}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.pendientes}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className={badgeColor}>{r.porcentaje}%</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos de equipo</p>
          )}
        </DashboardCard>

        {/* Pedidos mas lentos */}
        <DashboardCard title="Pedidos mas lentos" description="Top 5 pedidos con mas tiempo sin avance">
          {estancados.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Pedido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Estancado</TableHead>
                  <TableHead>Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {estancados.map((p: any) => {
                  const diasColor = p.diasEstancado > 5 ? "text-red-600" : p.diasEstancado > 3 ? "text-amber-600" : "text-stone-600"
                  const estadoLabel = ESTADOS_INTERNOS[p.estado]?.label || p.estado
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/pedidos/${p.id}`} className="font-mono hover:underline">#{p.numero}</Link>
                      </TableCell>
                      <TableCell className="text-xs">{estadoLabel}</TableCell>
                      <TableCell className={`text-right font-medium ${diasColor}`}>
                        {p.diasEstancado}d
                      </TableCell>
                      <TableCell className="text-xs text-stone-500">{p.responsable}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin pedidos estancados</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
