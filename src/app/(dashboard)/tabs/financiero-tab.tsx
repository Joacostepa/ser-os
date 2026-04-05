"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getMetricasFinancieras, getPosicionIVA, getGastosPorCategoria } from "@/lib/actions/reportes"
import { formatearMonto, formatearMontoCompleto, calcularVariacion } from "@/lib/formatters"
import { getPeriodDates, getPreviousPeriodDates, type Period } from "@/components/reportes/period-selector"
import { type Moneda } from "@/components/reportes/moneda-toggle"

const FRANJA_COLORS: Record<string, string> = {
  "0-15 dias": "bg-green-100 text-green-700",
  "16-30 dias": "bg-amber-100 text-amber-700",
  "31-60 dias": "bg-orange-100 text-orange-700",
  "60+ dias": "bg-red-100 text-red-700",
}

export function FinancieroTab({
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
  const [data, setData] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [iva, setIva] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gastosCat, setGastosCat] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period, customDesde, customHasta)
      const { desde: desdeAnt } = getPreviousPeriodDates(period, customDesde, customHasta)
      const [d, iv, gc] = await Promise.all([
        getMetricasFinancieras(desde, hasta),
        getPosicionIVA(desde, hasta),
        getGastosPorCategoria(desde, hasta),
      ])
      setData(d); setIva(iv); setGastosCat(gc)
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
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const varCobros = calcularVariacion(data.totalCobros, 0)
  const maxGasto = Math.max(...gastosCat.map((g: { monto: number }) => g.monto), 1)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Total a cobrar"
          value={formatearMonto(data.totalACobrar)}
          subtitle={`${data.pedidosConSaldo} pedidos con saldo`}
          valueColor={data.totalACobrar > 0 ? "text-amber-600" : ""}
        />
        <MetricCard
          label="Cobros del periodo"
          value={formatearMonto(data.totalCobros)}
        />
        <MetricCard
          label="Total a pagar"
          value={formatearMonto(data.totalEgresos)}
        />
        <MetricCard
          label="Flujo de caja"
          value={formatearMonto(data.flujoCaja)}
          valueColor={data.flujoCaja >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Antiguedad CxC */}
        <DashboardCard title="Antiguedad de cuentas a cobrar">
          {data.antiguedad.some((a: { monto: number }) => a.monto > 0) ? (
            <div className="space-y-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.antiguedad.map((a: any) => (
                <KPIRow
                  key={a.franja}
                  label={a.franja}
                  value={
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{formatearMonto(a.monto)}</span>
                      <Badge variant="secondary" className={FRANJA_COLORS[a.franja] || ""}>
                        {a.count || 0} pedidos
                      </Badge>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin cuentas a cobrar pendientes</p>
          )}
        </DashboardCard>

        {/* Resumen financiero */}
        <DashboardCard title="Resumen financiero del periodo">
          <div className="space-y-1">
            <KPIRow label="Cobros" value={<span className="text-green-600">{formatearMontoCompleto(data.totalCobros)}</span>} />
            <KPIRow label="(-) Pagos proveedores" value={<span className="text-red-600">-{formatearMontoCompleto(data.totalEgresos)}</span>} />
            <KPIRow label="(-) Gastos pagados" value={<span className="text-red-600">-{formatearMontoCompleto(0)}</span>} />
            <KPIRow label="= Flujo neto" value={
              <span className={`font-semibold ${data.flujoCaja >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatearMontoCompleto(data.flujoCaja)}
              </span>
            } bold />
            <KPIRow label="Ratio cobros/ventas" value={
              <Badge variant="secondary" className={data.totalCobros > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}>
                {data.totalACobrar + data.totalCobros > 0
                  ? `${((data.totalCobros / (data.totalACobrar + data.totalCobros)) * 100).toFixed(0)}%`
                  : "\u2014"}
              </Badge>
            } />
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Posicion IVA */}
        <DashboardCard title="Posicion IVA del periodo">
          <div className="space-y-1">
            <KPIRow label="IVA Debito (ventas)" value={formatearMontoCompleto(iva.ivaDebito)} />
            <KPIRow label="(-) IVA Credito compras" value={<span className="text-red-600">-{formatearMontoCompleto(iva.ivaCreditoCompras)}</span>} />
            <KPIRow label="(-) IVA Credito gastos" value={<span className="text-red-600">-{formatearMontoCompleto(iva.ivaCreditoGastos)}</span>} />
            <KPIRow label="= Saldo AFIP" value={
              <span className={`font-semibold ${iva.saldoAFIP >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatearMontoCompleto(Math.abs(iva.saldoAFIP))} {iva.saldoAFIP >= 0 ? "(a pagar)" : "(a favor)"}
              </span>
            } bold />
          </div>
        </DashboardCard>

        {/* Gastos por categoria */}
        <DashboardCard title="Gastos por categoria">
          {gastosCat.length > 0 ? (
            <div className="space-y-2">
              {gastosCat.map((g: { categoria: string; monto: number }) => (
                <div key={g.categoria} className="flex items-center gap-3">
                  <span className="text-xs text-stone-500 w-36 shrink-0 text-right truncate">{g.categoria}</span>
                  <div className="flex-1">
                    <div
                      className="h-7 rounded-md flex items-center px-2.5 bg-red-400"
                      style={{
                        width: `${Math.max((g.monto / maxGasto) * 100, 8)}%`,
                      }}
                    >
                      <span className="text-xs font-medium text-white">{formatearMonto(g.monto)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-stone-100">
                <Link href="/gastos" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                  Ver todos los gastos &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin gastos en este periodo</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
