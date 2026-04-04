import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import {
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Package,
  Clock,
  CreditCard,
  CheckCircle2,
  Boxes,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { EstadoBadge } from "@/components/shared/status-badge"
import type { EstadoInterno } from "@/types/database"
import { KpiCard } from "@/components/reportes/kpi-card"
import { getResumenGeneral, getAlertasActivas, getEvolucionMensual } from "@/lib/actions/reportes"
import { DashboardCharts } from "./dashboard-charts"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Current month dates
  const now = new Date()
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const mesHasta = now.toISOString()

  const [resumen, alertas, evolucion, recientesRes] = await Promise.all([
    getResumenGeneral(mesInicio, mesHasta),
    getAlertasActivas(),
    getEvolucionMensual(6),
    supabase
      .from("pedidos")
      .select("id, numero_tn, tipo, estado_interno, monto_total, monto_total_usd, created_at, cliente:clientes(nombre)")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidosRecientes: any[] = recientesRes.data || []

  const totalAlertas = alertas.insumosStockBajo.length +
    alertas.comprasPendientes.filter((c) => c.dias_atraso > 0).length +
    alertas.pedidosSinPagar.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vista general del negocio</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pedidos/nuevo"><Button size="sm">Nuevo pedido</Button></Link>
          <Link href="/reportes"><Button variant="outline" size="sm">Ver reportes</Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Facturación del mes"
          value={`$${resumen.facturacionArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`}
          subtitle={resumen.facturacionUsd > 0 ? `US$${resumen.facturacionUsd.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : undefined}
          trend={resumen.variacionPct}
          icon={DollarSign}
        />
        <KpiCard
          title="Pedidos del mes"
          value={String(resumen.totalPedidos)}
          subtitle={`Ticket prom: $${resumen.ticketPromedio.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`}
          icon={ShoppingCart}
        />
        <KpiCard
          title="Deuda pendiente"
          value={`$${resumen.totalDeuda.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`}
          subtitle={`${resumen.pedidosConDeuda} pedidos`}
          icon={CreditCard}
          variant={resumen.totalDeuda > 0 ? "warning" : "success"}
        />
        <KpiCard
          title="Alertas activas"
          value={String(totalAlertas)}
          subtitle={totalAlertas > 0 ? "Requieren atención" : "Todo en orden"}
          icon={AlertTriangle}
          variant={totalAlertas > 0 ? "danger" : "success"}
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        evolucion={evolucion}
        pedidosPorEstado={resumen.pedidosPorEstado}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alertas */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAlertas > 0 ? (
              <div className="space-y-2">
                {alertas.insumosStockBajo.map((i) => (
                  <Link key={i.id} href={`/insumos/${i.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded">
                    <Boxes className="h-4 w-4 text-amber-500" />
                    <span className="flex-1">{i.nombre}</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      Stock: {Number(i.stock_actual).toLocaleString("es-AR")} / {Number(i.stock_minimo).toLocaleString("es-AR")}
                    </Badge>
                  </Link>
                ))}
                {alertas.comprasPendientes.filter((c) => c.dias_atraso > 0).map((c) => (
                  <Link key={c.id} href={`/compras/${c.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded">
                    <Truck className="h-4 w-4 text-red-500" />
                    <span className="flex-1">{c.proveedor}</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      {c.dias_atraso}d atraso
                    </Badge>
                  </Link>
                ))}
                {alertas.pedidosSinPagar.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/pedidos/${p.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded">
                    <CreditCard className="h-4 w-4 text-orange-500" />
                    <span className="flex-1">#{p.numero_tn || p.id.slice(0, 8)} — {p.cliente}</span>
                    <span className="font-medium text-red-600 tabular-nums">
                      ${p.saldo.toLocaleString("es-AR")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                Sin alertas activas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pedidos recientes */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Últimos pedidos</CardTitle>
            <Link href="/pedidos">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pedidosRecientes.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/pedidos/${p.id}`}
                  className="flex items-center gap-2 hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded"
                >
                  <span className="text-sm font-medium w-16 tabular-nums">
                    #{p.numero_tn || p.id.slice(0, 6)}
                  </span>
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {p.cliente?.nombre}
                  </span>
                  <span className="text-sm tabular-nums">
                    ${Number(p.monto_total).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </span>
                  <EstadoBadge estado={p.estado_interno} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
