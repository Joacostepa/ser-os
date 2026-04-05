"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getRentabilidadPorPedido, getRentabilidadPorCliente, getEstadoResultados } from "@/lib/actions/reportes"
import { formatearMonto, formatearMontoCompleto } from "@/lib/formatters"
import { getPeriodDates, getPreviousPeriodDates, type Period } from "@/components/reportes/period-selector"
import { type Moneda } from "@/components/reportes/moneda-toggle"

function margenBadge(pct: number) {
  const color = pct > 40 ? "bg-green-100 text-green-700"
    : pct > 20 ? "bg-amber-100 text-amber-700"
    : pct > 0 ? "bg-orange-100 text-orange-700"
    : "bg-red-100 text-red-700"
  return <Badge variant="secondary" className={color}>{pct.toFixed(1)}%</Badge>
}

export function RentabilidadTab({
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
  const [pedidos, setPedidos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientes, setClientes] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [er, setEr] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period, customDesde, customHasta)
      const [p, c, e] = await Promise.all([
        getRentabilidadPorPedido(desde, hasta),
        getRentabilidadPorCliente(desde, hasta),
        getEstadoResultados(desde, hasta),
      ])
      setPedidos(p); setClientes(c); setEr(e)
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
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const pedidosMargenBajo = pedidos.filter((p) => p.margen_pct < 20 && p.margen_pct !== 0).length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Margen bruto %"
          value={`${er.margenBrutoPct.toFixed(1)}%`}
          valueColor={er.margenBrutoPct > 30 ? "text-green-600" : er.margenBrutoPct > 15 ? "text-amber-600" : "text-red-600"}
        />
        <MetricCard
          label="Resultado operativo"
          value={formatearMonto(er.resultado)}
          valueColor={er.resultado >= 0 ? "text-green-600" : "text-red-600"}
          subtitle={`${er.resultadoPct.toFixed(1)}% de ventas`}
        />
        <MetricCard
          label="CMV"
          value={formatearMonto(er.cmv)}
          subtitle={`${er.ventasBrutas > 0 ? ((er.cmv / er.ventasBrutas) * 100).toFixed(0) : 0}% de ventas`}
        />
        <MetricCard
          label="Pedidos margen < 20%"
          value={String(pedidosMargenBajo)}
          valueColor={pedidosMargenBajo > 0 ? "text-red-600" : ""}
          subtitle={pedidosMargenBajo > 0 ? "Revisar pricing" : "OK"}
        />
      </div>

      {/* Estado de resultados mini */}
      <DashboardCard title="Estado de resultados — periodo seleccionado">
        <div className="space-y-0">
          <KPIRow label="Ventas netas" value={formatearMontoCompleto(er.ventasBrutas)} />
          <KPIRow label="(-) Costo mercaderia vendida" value={<span className="text-red-600">-{formatearMontoCompleto(er.cmv)}</span>} />
          <KPIRow label="= Margen bruto" value={
            <span className={er.margenBruto >= 0 ? "text-green-600" : "text-red-600"}>
              {formatearMontoCompleto(er.margenBruto)} ({er.margenBrutoPct.toFixed(1)}%)
            </span>
          } bold />
          <KPIRow label="(-) Gastos operativos" value={<span className="text-red-600">-{formatearMontoCompleto(er.gastosOperativos)}</span>} />
          {/* Subcategorias de gastos indented */}
          {er.gastosDesglose?.map((g: { categoria: string; monto: number }) => (
            <KPIRow
              key={g.categoria}
              label={<span className="pl-4 text-stone-400">{g.categoria}</span>}
              value={<span className="text-stone-400">{formatearMontoCompleto(g.monto)}</span>}
            />
          ))}
          <KPIRow label="= Resultado operativo" value={
            <span className={`text-base ${er.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatearMontoCompleto(er.resultado)} ({er.resultadoPct.toFixed(1)}%)
            </span>
          } bold />
        </div>
      </DashboardCard>

      {/* Rentabilidad por cliente */}
      <DashboardCard title="Rentabilidad por cliente" description="Los que mas facturan no siempre son los mas rentables">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Facturado</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Margen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {clientes.slice(0, 10).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><Link href={`/clientes/${c.id}`} className="font-medium hover:underline">{c.nombre}</Link></TableCell>
                <TableCell className="text-right tabular-nums">{c.pedidos}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMonto(c.facturado)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMonto(c.costo)}</TableCell>
                <TableCell className="text-right">{margenBadge(c.margen_pct)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardCard>

      {/* Rentabilidad por pedido */}
      <DashboardCard title="Rentabilidad por pedido (top 20)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead># Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Venta</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Margen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pedidos.slice(0, 20).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell><Link href={`/pedidos/${p.id}`} className="font-mono hover:underline">#{p.numero_tn || p.id.slice(0, 8)}</Link></TableCell>
                <TableCell>{p.cliente}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMonto(p.monto)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMonto(p.costo)}</TableCell>
                <TableCell className="text-right">{margenBadge(p.margen_pct)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardCard>
    </div>
  )
}
