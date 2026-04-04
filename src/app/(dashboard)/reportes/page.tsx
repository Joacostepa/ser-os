"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { PeriodSelector, getPeriodDates, type Period } from "@/components/reportes/period-selector"
import { ChartContainer } from "@/components/reportes/chart-container"
import {
  getRentabilidadPorPedido,
  getRentabilidadPorCliente,
  getEvolucionMensual,
  getDistribucionPedidos,
  getAlertasActivas,
} from "@/lib/actions/reportes"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
  PieChart, Pie, Cell,
} from "recharts"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"
import { UNIDAD_INSUMO_CONFIG } from "@/lib/constants"
import type { UnidadInsumo } from "@/types/database"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCurrency(value: any) {
  return `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
}

function formatMes(mes: string) {
  const [year, month] = mes.split("-")
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${meses[parseInt(month) - 1]} ${year.slice(2)}`
}

export default function ReportesPage() {
  const [period, setPeriod] = useState<Period>("last_3_months")
  const [loading, setLoading] = useState(true)

  // Data states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rentPedidos, setRentPedidos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rentClientes, setRentClientes] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evolucion, setEvolucion] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [distribucion, setDistribucion] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alertas, setAlertas] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { desde, hasta } = getPeriodDates(period)

      const [rp, rc, ev, dist, al] = await Promise.all([
        getRentabilidadPorPedido(desde, hasta),
        getRentabilidadPorCliente(desde, hasta),
        getEvolucionMensual(6),
        getDistribucionPedidos(desde, hasta),
        getAlertasActivas(),
      ])

      setRentPedidos(rp)
      setRentClientes(rc)
      setEvolucion(ev)
      setDistribucion(dist)
      setAlertas(al)
      setLoading(false)
    }
    fetchData()
  }, [period])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  const evolucionData = evolucion.map((m) => ({
    mes: formatMes(m.mes),
    Facturación: m.facturacion_ars,
    USD: m.facturacion_usd,
    Pedidos: m.pedidos_count,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Análisis e insights del negocio</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <Tabs defaultValue="comercial">
        <TabsList>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
          <TabsTrigger value="stock">Stock & Compras</TabsTrigger>
        </TabsList>

        {/* === COMERCIAL === */}
        <TabsContent value="comercial" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Evolución de facturación">
              <LineChart data={evolucionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="Facturación" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="USD" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>

            <ChartContainer title="Distribución por tipo">
              <PieChart>
                <Pie
                  data={distribucion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {distribucion.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartContainer>
          </div>

          {/* Top clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top clientes por facturación</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer title="" height={Math.max(200, rentClientes.slice(0, 10).length * 35)}>
                <BarChart data={rentClientes.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total_facturado" name="Facturado" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === RENTABILIDAD === */}
        <TabsContent value="rentabilidad" className="space-y-6 mt-4">
          {/* Margen por cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rentabilidad por cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {rentClientes.map((c: any) => {
                    const margenColor = c.margen_pct > 40 ? "text-green-600" : c.margen_pct > 20 ? "text-amber-600" : "text-red-600"
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                            {c.nombre}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">{c.categoria}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.total_pedidos}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(c.total_facturado)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(c.total_costo)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(c.margen_bruto)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-bold ${margenColor}`}>
                          {c.margen_pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Margen por pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rentabilidad por pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead># Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Venta</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {rentPedidos.map((p: any) => {
                    const margenBadge = p.margen_pct > 40
                      ? "bg-green-100 text-green-700"
                      : p.margen_pct > 20
                        ? "bg-amber-100 text-amber-700"
                        : p.margen_pct > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link href={`/pedidos/${p.id}`} className="font-medium font-mono hover:underline">
                            #{p.numero_tn || p.id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell>{p.cliente}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(p.monto_total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(p.costo_total)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(p.margen_bruto)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={margenBadge}>
                            {p.margen_pct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-700">
                          {p.monto_total_usd > 0 ? `US$${p.monto_total_usd.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === STOCK & COMPRAS === */}
        <TabsContent value="stock" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Insumos con stock bajo mínimo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertas?.insumosStockBajo?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead className="text-right">Faltante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {alertas.insumosStockBajo.map((i: any) => {
                        const unidad = UNIDAD_INSUMO_CONFIG[i.unidad as UnidadInsumo]
                        const faltante = Number(i.stock_minimo) - Number(i.stock_actual)
                        return (
                          <TableRow key={i.id}>
                            <TableCell>
                              <Link href={`/insumos/${i.id}`} className="font-medium hover:underline">
                                {i.nombre}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-red-600">
                              {Number(i.stock_actual).toLocaleString("es-AR")} {unidad?.short}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {Number(i.stock_minimo).toLocaleString("es-AR")} {unidad?.short}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-red-600">
                              -{faltante.toLocaleString("es-AR")} {unidad?.short}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Todos los insumos están sobre mínimo</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compras pendientes de recepción</CardTitle>
              </CardHeader>
              <CardContent>
                {alertas?.comprasPendientes?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Entrega esperada</TableHead>
                        <TableHead className="text-right">Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {alertas.comprasPendientes.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link href={`/compras/${c.id}`} className="font-medium hover:underline">
                              {c.proveedor}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {c.fecha_esperada
                              ? format(new Date(c.fecha_esperada), "dd/MM/yyyy", { locale: es })
                              : "Sin fecha"}
                          </TableCell>
                          <TableCell className="text-right">
                            {c.dias_atraso > 0 ? (
                              <Badge variant="secondary" className="bg-red-100 text-red-700">
                                {c.dias_atraso}d
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                En plazo
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No hay compras pendientes</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
