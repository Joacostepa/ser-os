"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"

interface DashboardChartsProps {
  evolucion: {
    mes: string
    facturacion_ars: number
    pedidos_count: number
    cobros: number
    gastos: number
  }[]
  pedidosPorEstado: { estado: string; count: number }[]
}

function formatMes(mes: string) {
  const [year, month] = mes.split("-")
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${meses[parseInt(month) - 1]} ${year.slice(2)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCurrency(value: any) {
  return `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
}

export function DashboardCharts({ evolucion, pedidosPorEstado }: DashboardChartsProps) {
  const facturacionData = evolucion.map((m) => ({
    mes: formatMes(m.mes),
    Facturación: m.facturacion_ars,
    Cobros: m.cobros,
  }))

  const estadoData = pedidosPorEstado
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      estado: ESTADOS_INTERNOS[e.estado as EstadoInterno]?.label || e.estado,
      count: e.count,
      color: ESTADOS_INTERNOS[e.estado as EstadoInterno]?.color || "#94a3b8",
    }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Facturación mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={facturacionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="Facturación" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cobros" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pedidos activos por estado</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={estadoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="estado" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="count" name="Pedidos" radius={[0, 4, 4, 0]}>
                {estadoData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
