import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CostCard({ pedido }: { pedido: any }) {
  const montoTotal = Number(pedido.monto_total || 0)

  // Calculate cost from items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const costoProductos = pedido.items?.reduce((sum: number, item: any) => {
    return sum + (Number(item.costo_unitario || 0) * Number(item.cantidad))
  }, 0) ?? 0

  const margenBruto = montoTotal - costoProductos
  const margenPct = montoTotal > 0 ? (margenBruto / montoTotal) * 100 : 0

  const margenColor = margenPct >= 30 ? "text-green-600" : margenPct >= 20 ? "text-amber-600" : "text-red-600"
  const margenBadge = margenPct >= 30 ? "bg-green-100 text-green-700" : margenPct >= 20 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"

  return (
    <DashboardCard title="Costos y margen">
      {costoProductos > 0 ? (
        <div className="space-y-0">
          <KPIRow label="Costo productos" value={`$${costoProductos.toLocaleString("es-AR")}`} />
          <KPIRow label="Costo total" value={<span className="font-medium">${costoProductos.toLocaleString("es-AR")}</span>} bold />
          <div className="pt-2 mt-2 border-t border-muted">
            <KPIRow
              label="Margen bruto"
              value={
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${margenColor}`}>
                    ${margenBruto.toLocaleString("es-AR")}
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
              <span className="text-green-700">US${Number(pedido.monto_total_usd).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
            } />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Sin datos de costo. Cargar costos en los items del pedido.
        </p>
      )}
    </DashboardCard>
  )
}
