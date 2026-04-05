"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MetricCard } from "@/components/reportes/kpi-card"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardMarketing } from "@/lib/actions/marketing"
import { formatearMonto } from "@/lib/formatters"

const ESTADO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  activa: { bg: "bg-green-500", text: "text-green-700", label: "Activas" },
  inactiva: { bg: "bg-amber-400", text: "text-amber-700", label: "Inactivas" },
  dormida: { bg: "bg-stone-400", text: "text-stone-600", label: "Dormidas" },
  reactivacion: { bg: "bg-blue-500", text: "text-blue-700", label: "Reactivacion" },
  nunca_compro: { bg: "bg-gray-300", text: "text-gray-500", label: "Nunca compro" },
}

export default function MarketingDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const result = await getDashboardMarketing()
        setData(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-medium text-stone-900">Marketing</h1>
        <p className="text-sm text-stone-400">No se pudieron cargar los datos del dashboard.</p>
      </div>
    )
  }

  const maxDistribucion = Math.max(...(data.distribucion?.map((d: { count: number }) => d.count) ?? [1]))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Marketing</h1>
        <p className="text-sm text-stone-400">Dashboard del Club SER</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Clientas activas"
          value={String(data.clientasActivas)}
          subtitle={`de ${data.total} total`}
        />
        <MetricCard
          label="Tasa conversion"
          value={`${data.tasaConversion}%`}
          subtitle="ultima campana"
        />
        <MetricCard
          label="Revenue con cupon"
          value={formatearMonto(data.revenueCupon)}
          subtitle="ultima campana"
          valueColor="text-green-700"
        />
        <MetricCard
          label="Clientas VIP"
          value={String(data.vipCount)}
          subtitle="nivel premium"
          valueColor="text-amber-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribucion por estado */}
        <DashboardCard title="Distribucion por estado" description="Todas las clientas del club">
          <div className="space-y-3">
            {data.distribucion?.map((d: { estado: string; count: number }) => {
              const config = ESTADO_COLORS[d.estado]
              if (!config) return null
              const pct = maxDistribucion > 0 ? (d.count / maxDistribucion) * 100 : 0
              return (
                <div key={d.estado} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                    <span className="text-xs font-mono text-stone-500">{d.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100">
                    <div
                      className={`h-2 rounded-full ${config.bg} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </DashboardCard>

        {/* Conversion por estado */}
        <DashboardCard title="Conversion por estado" description="Ultima campana">
          <div className="overflow-hidden rounded-lg border border-stone-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/50">
                  <th className="text-xs text-stone-400 font-medium py-2 px-3 text-left">Estado</th>
                  <th className="text-xs text-stone-400 font-medium py-2 px-3 text-right">Usaron</th>
                  <th className="text-xs text-stone-400 font-medium py-2 px-3 text-right">Total</th>
                  <th className="text-xs text-stone-400 font-medium py-2 px-3 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.conversionPorEstado?.map((c: { estado: string; usaron: number; total: number; porcentaje: number }) => {
                  const config = ESTADO_COLORS[c.estado]
                  return (
                    <tr key={c.estado} className="border-b border-stone-100 last:border-0">
                      <td className="py-2 px-3">
                        <span className={`text-xs font-medium ${config?.text ?? "text-stone-500"}`}>
                          {config?.label ?? c.estado}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-stone-600">{c.usaron}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-stone-400">{c.total}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs font-medium text-stone-800">{c.porcentaje}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      {/* Top 10 clientas */}
      <DashboardCard title="Top 10 clientas por racha" description="Compras consecutivas mensuales">
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/50">
                <th className="text-xs text-stone-400 font-medium py-2 px-3 text-left">Cliente</th>
                <th className="text-xs text-stone-400 font-medium py-2 px-3 text-left">Nivel</th>
                <th className="text-xs text-stone-400 font-medium py-2 px-3 text-right">Racha</th>
                <th className="text-xs text-stone-400 font-medium py-2 px-3 text-right">Total facturado</th>
              </tr>
            </thead>
            <tbody>
              {data.top10?.map((c: { id: string; nombre: string; nivel: string; racha: number; total_facturado: number }, idx: number) => (
                <tr key={c.id ?? idx} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 px-3">
                    {c.id ? (
                      <Link href={`/clientes/${c.id}`} className="text-sm font-medium text-stone-800 hover:underline">
                        {c.nombre}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-stone-800">{c.nombre}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <Badge
                      variant="secondary"
                      className={c.nivel === "VIP" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}
                    >
                      {c.nivel}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="font-mono text-sm text-stone-800">
                      {c.racha}m {c.racha > 6 ? "\uD83D\uDD25" : ""}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-sm text-stone-800">
                    {formatearMonto(c.total_facturado)}
                  </td>
                </tr>
              ))}
              {(!data.top10 || data.top10.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-stone-400">
                    No hay datos de clientas aun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  )
}
