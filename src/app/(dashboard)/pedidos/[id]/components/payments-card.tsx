"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RegistrarPagoModal } from "@/components/pagos/registrar-pago-modal"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PlusIcon } from "lucide-react"

const TIPO_PAGO_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  anticipo: { label: "Anticipo", variant: "secondary" },
  parcial: { label: "Parcial", variant: "outline" },
  saldo: { label: "Saldo", variant: "default" },
  total: { label: "Total", variant: "default" },
  sena: { label: "Sena", variant: "secondary" },
  pago_total: { label: "Total", variant: "default" },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PaymentsCard({ pedido }: { pedido: any }) {
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  const montoTotal = Number(pedido.monto_total || 0)
  const montoPagado = Number(pedido.monto_pagado || 0)
  const saldo = Number(pedido.saldo_pendiente || 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagos: any[] = pedido.pagos || []
  const clienteId = pedido.cliente_id || pedido.cliente?.id || ""
  const numeroPedido = pedido.numero_tn || pedido.id?.slice(0, 8) || null

  function handleSuccess() {
    router.refresh()
  }

  return (
    <>
      <DashboardCard title="Pagos">
        {/* Summary */}
        <div className="space-y-0">
          <KPIRow
            label="Total del pedido"
            value={<span className="font-mono font-medium">${montoTotal.toLocaleString("es-AR")}</span>}
          />
          <KPIRow
            label="Cobrado"
            value={<span className="font-mono text-green-600">${montoPagado.toLocaleString("es-AR")}</span>}
          />
          <KPIRow
            label="Saldo pendiente"
            value={
              <span className={`font-mono font-medium ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                ${saldo.toLocaleString("es-AR")}
              </span>
            }
          />
        </div>

        {/* Payment list */}
        {pagos.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Detalle de pagos
            </p>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pagos.map((p: any) => {
                const tipoPagoKey = p.concepto || "sena"
                const badgeConfig = TIPO_PAGO_BADGE[tipoPagoKey] || { label: tipoPagoKey, variant: "outline" as const }

                // Extract numero_recibo from notas if present
                const reciboMatch = p.notas?.match(/Recibo:\s*([^\s|]+)/)
                const numeroRecibo = reciboMatch?.[1] || null

                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-stone-400 shrink-0">
                        {format(new Date(p.fecha), "dd/MM", { locale: es })}
                      </span>
                      <Badge variant={badgeConfig.variant} className="shrink-0">
                        {badgeConfig.label}
                      </Badge>
                      <span className="text-xs text-stone-400 truncate">
                        {p.metodo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm tabular-nums">
                        ${Number(p.monto).toLocaleString("es-AR")}
                      </span>
                      {numeroRecibo && (
                        <span className="text-[10px] text-stone-400" title={`Recibo ${numeroRecibo}`}>
                          R
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pagos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2 mt-2">
            Sin pagos registrados
          </p>
        )}

        {/* Register payment button */}
        {saldo > 0 && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setModalOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Registrar pago
            </Button>
          </div>
        )}
      </DashboardCard>

      <RegistrarPagoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pedidoId={pedido.id}
        clienteId={clienteId}
        montoTotal={montoTotal}
        montoPagado={montoPagado}
        saldoPendiente={saldo}
        numeroPedido={numeroPedido}
        onSuccess={handleSuccess}
      />
    </>
  )
}
