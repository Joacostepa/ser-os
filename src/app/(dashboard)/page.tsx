import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import {
  ShoppingCart,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  CreditCard,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { EstadoBadge } from "@/components/shared/status-badge"
import type { EstadoInterno } from "@/types/database"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch dashboard data in parallel
  const [
    pedidosRes,
    tareasRes,
    pendientesPagoRes,
    recientesRes,
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select("estado_interno")
      .not("estado_interno", "in", '("cerrado","cancelado")'),
    supabase
      .from("tareas")
      .select("estado")
      .in("estado", ["pendiente", "en_proceso", "bloqueada"]),
    supabase
      .from("pedidos")
      .select("id, numero_tn, saldo_pendiente, cliente:clientes(nombre)")
      .gt("saldo_pendiente", 0)
      .not("estado_interno", "in", '("cerrado","cancelado")')
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("pedidos")
      .select("id, numero_tn, tipo, estado_interno, prioridad, created_at, cliente:clientes(nombre)")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidos: any[] = pedidosRes.data || []
  const tareasPendientes = tareasRes.data?.length ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidosPendientesPago: any[] = pendientesPagoRes.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidosRecientes: any[] = recientesRes.data || []

  // Count by estado
  const contadores: Record<string, number> = {}
  for (const p of pedidos) {
    contadores[p.estado_interno] = (contadores[p.estado_interno] || 0) + 1
  }

  const pedidosActivos = pedidos.length
  const pedidosNuevos = contadores["nuevo"] || 0
  const listoDespacho = contadores["listo_para_despacho"] || 0
  const esperandoInsumos = (contadores["esperando_insumos"] || 0) + (contadores["esperando_diseno"] || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vista general del estado del negocio</p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pedidos activos</span>
            </div>
            <p className="text-3xl font-bold mt-1">{pedidosActivos}</p>
            {pedidosNuevos > 0 && (
              <p className="text-xs text-blue-600 mt-1">{pedidosNuevos} nuevos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tareas pendientes</span>
            </div>
            <p className="text-3xl font-bold mt-1">{tareasPendientes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Listos despacho</span>
            </div>
            <p className="text-3xl font-bold mt-1 text-violet-600">{listoDespacho}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Esperando insumos</span>
            </div>
            <p className="text-3xl font-bold mt-1 text-orange-600">{esperandoInsumos}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pedidos por estado */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Pedidos por estado</CardTitle>
            <Link href="/pedidos">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(contadores)
                .sort(([, a], [, b]) => b - a)
                .map(([estado, count]) => {
                  const config = ESTADOS_INTERNOS[estado as EstadoInterno]
                  if (!config) return null
                  return (
                    <div key={estado} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm">{config.label}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Alertas de pago */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagos pendientes
            </CardTitle>
            <Link href="/pagos">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pedidosPendientesPago.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pedidosPendientesPago.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/pedidos/${p.id}`}
                    className="flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {p.numero_tn || `#${p.id.slice(0, 8)}`}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {p.cliente?.nombre}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-red-600 tabular-nums">
                      ${Number(p.saldo_pendiente).toLocaleString("es-AR")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                Todos los pedidos están al día
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pedidos recientes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos recientes</CardTitle>
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
                className="flex items-center gap-3 hover:bg-muted/50 -mx-2 px-2 py-2 rounded"
              >
                <span className="text-sm font-medium w-24">
                  {p.numero_tn || `#${p.id.slice(0, 8)}`}
                </span>
                <span className="text-sm text-muted-foreground flex-1">
                  {p.cliente?.nombre}
                </span>
                <Badge variant="secondary" className="capitalize text-xs">
                  {p.tipo}
                </Badge>
                <EstadoBadge estado={p.estado_interno} />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Link href="/pedidos/nuevo">
          <Button>Nuevo pedido</Button>
        </Link>
        <Link href="/pedidos?vista=kanban">
          <Button variant="outline">Ver Kanban</Button>
        </Link>
        <Link href="/pagos">
          <Button variant="outline">Registrar pago</Button>
        </Link>
      </div>
    </div>
  )
}
