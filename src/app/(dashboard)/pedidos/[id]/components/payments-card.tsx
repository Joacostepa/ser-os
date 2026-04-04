import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PaymentsCard({ pedido }: { pedido: any }) {
  const montoTotal = Number(pedido.monto_total || 0)
  const montoPagado = Number(pedido.monto_pagado || 0)
  const saldo = Number(pedido.saldo_pendiente || 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagos: any[] = pedido.pagos || []

  return (
    <DashboardCard title="Pagos">
      <div className="space-y-0">
        <KPIRow label="Total del pedido" value={<span className="font-medium">${montoTotal.toLocaleString("es-AR")}</span>} />
        <KPIRow label="Anticipo recibido" value={<span className="text-green-600">${montoPagado.toLocaleString("es-AR")}</span>} />
        <KPIRow label="Saldo pendiente" value={
          <span className={`font-medium ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
            ${saldo.toLocaleString("es-AR")}
          </span>
        } />
      </div>

      {pagos.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Detalle de pagos</p>
          <div className="space-y-0">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pagos.map((p: any) => (
              <KPIRow
                key={p.id}
                label={`${format(new Date(p.fecha), "dd/MM", { locale: es })} · ${p.metodo}`}
                value={<span className="tabular-nums">${Number(p.monto).toLocaleString("es-AR")}</span>}
              />
            ))}
          </div>
        </div>
      )}

      {pagos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2 mt-2">Sin pagos registrados</p>
      )}
    </DashboardCard>
  )
}
