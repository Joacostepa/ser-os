"use client"

import { useEffect, useState } from "react"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { calcularCostoPedido } from "@/lib/costeo/calcular-costo"
import { AlertTriangle, Loader2 } from "lucide-react"

interface CosteoItem {
  item_pedido_id: string
  producto_nombre: string
  cantidad: number
  costo_unitario: number
  costo_linea: number
  receta_completa: boolean
}

interface CosteoResult {
  costo_total: number
  items: CosteoItem[]
  pedido_costeo_completo: boolean
  alertas: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CostCard({ pedido }: { pedido: any }) {
  const [costeo, setCosteo] = useState<CosteoResult | null>(null)
  const [loading, setLoading] = useState(true)

  const montoTotal = Number(pedido.monto_total || 0)

  useEffect(() => {
    calcularCostoPedido(pedido.id)
      .then((result) => setCosteo(result))
      .catch(() => setCosteo(null))
      .finally(() => setLoading(false))
  }, [pedido.id])

  if (loading) {
    return (
      <DashboardCard title="Costos y margen">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
          <span className="ml-2 text-sm text-stone-400">Calculando costeo...</span>
        </div>
      </DashboardCard>
    )
  }

  if (!costeo || costeo.costo_total === 0) {
    return (
      <DashboardCard title="Costos y margen">
        <p className="text-sm text-muted-foreground text-center py-2">
          Sin datos de costo. Definir recetas en los productos para calcular automaticamente.
        </p>
      </DashboardCard>
    )
  }

  const margenBruto = montoTotal - costeo.costo_total
  const margenPct = montoTotal > 0 ? (margenBruto / montoTotal) * 100 : 0

  const margenColor = margenPct >= 40 ? "text-green-700" : margenPct >= 20 ? "text-amber-700" : "text-red-700"
  const margenBadge = margenPct >= 40 ? "bg-green-100 text-green-700" : margenPct >= 20 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"

  return (
    <DashboardCard title="Costos y margen">
      <div className="space-y-3">
        {/* Desglose table */}
        {costeo.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Costo total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costeo.items.map((item) => (
                <TableRow key={item.item_pedido_id}>
                  <TableCell className="font-normal">
                    {item.producto_nombre}
                    {!item.receta_completa && (
                      <AlertTriangle className="inline h-3 w-3 ml-1 text-amber-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.cantidad}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${item.costo_unitario.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    ${item.costo_linea.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Totals */}
        <div className="space-y-0">
          <KPIRow label="Costo total" value={
            <span className="font-mono font-medium">${costeo.costo_total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          } bold />
          <KPIRow label="Monto venta" value={
            <span className="font-mono">${montoTotal.toLocaleString("es-AR")}</span>
          } />
          <div className="pt-2 mt-2 border-t border-stone-100">
            <KPIRow
              label="Margen bruto"
              value={
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-medium ${margenColor}`}>
                    ${margenBruto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                  <Badge variant="secondary" className={margenBadge}>
                    {margenPct.toFixed(1)}%
                  </Badge>
                </div>
              }
              bold
            />
          </div>
          {pedido.monto_total_usd && (
            <KPIRow label="Equivalente USD" value={
              <span className="font-mono text-green-700">US${Number(pedido.monto_total_usd).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
            } />
          )}
        </div>

        {/* Alertas */}
        {costeo.alertas.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 mt-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Costeo incompleto</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {costeo.alertas.map((alerta, i) => (
                    <li key={i}>{alerta}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  )
}
