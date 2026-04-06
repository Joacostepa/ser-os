"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OrderHeader } from "./components/order-header"
import { ClasificacionBanner } from "@/components/pedidos/clasificacion-banner"
import { AlertBar } from "./components/alert-bar"
import { ProgressBarComponent } from "./components/progress-bar"
import { ProductsCard } from "./components/products-card"
import { TimelineCard } from "./components/timeline-card"
import { ClientCard } from "./components/client-card"
import { PaymentsCard } from "./components/payments-card"
import { CostCard } from "./components/cost-card"
import { ShippingCard } from "./components/shipping-card"
import { CommentsCard } from "./components/comments-card"
import { ChangeStatusModal } from "./components/change-status-modal"
import { CancelarPedidoModal } from "@/components/pedidos/cancelar-pedido-modal"
import { PedidoChecklist } from "@/components/pedidos/pedido-checklist"
import { XCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PedidoDetailView({ pedido, userRol = "admin" }: { pedido: any; userRol?: string }) {
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const router = useRouter()

  const isCancelado = pedido.estado_interno === "cancelado"

  return (
    <div className={`space-y-5 ${isCancelado ? "opacity-80" : ""}`}>
      {/* Header */}
      <OrderHeader
        pedido={pedido}
        onAvanzarEstado={() => setStatusModalOpen(true)}
        onCancelar={() => setCancelModalOpen(true)}
        userRol={userRol}
      />

      {/* Banner de pedido cancelado */}
      {isCancelado && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="font-medium text-red-700">
              Este pedido fue cancelado
              {pedido.cancelado_en && ` el ${format(new Date(pedido.cancelado_en), "dd/MM/yyyy", { locale: es })}`}
            </span>
          </div>
          {pedido.cancelacion_motivo && (
            <p className="text-sm text-red-600 pl-7">Motivo: {pedido.cancelacion_motivo}</p>
          )}
          {pedido.cancelacion_origen && (
            <p className="text-sm text-red-600 pl-7">
              Origen: {pedido.cancelacion_origen === "webhook_tn" ? "Cancelado desde Tienda Nube" : "Cancelación manual"}
            </p>
          )}
          {Number(pedido.cancelacion_saldo_favor) > 0 && (
            <p className="text-sm text-red-600 pl-7">
              Saldo a favor generado: <span className="font-[Geist_Mono] font-medium">${Number(pedido.cancelacion_saldo_favor).toLocaleString("es-AR")}</span>
            </p>
          )}
        </div>
      )}

      {/* Banner de clasificacion */}
      {pedido.tipo === "sin_clasificar" &&
        ["nuevo", "pendiente_de_sena", "pendiente_sena"].includes(pedido.estado_interno) && (
          <ClasificacionBanner
            pedidoId={pedido.id}
            onClassify={() => router.refresh()}
          />
        )}

      {/* Alertas */}
      <AlertBar pedido={pedido} />

      {/* Barra de progreso */}
      {!isCancelado && <ProgressBarComponent pedido={pedido} />}

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Columna izquierda — principal */}
        <div className="space-y-6">
          {/* Checklist */}
          {!isCancelado && <PedidoChecklist pedidoId={pedido.id} />}

          {/* Productos */}
          <ProductsCard items={pedido.items || []} montoTotal={Number(pedido.monto_total)} />

          {/* Timeline */}
          <TimelineCard pedido={pedido} />
        </div>

        {/* Columna derecha — sidebar */}
        <div className="space-y-5">
          <ClientCard cliente={pedido.cliente} />
          <PaymentsCard pedido={pedido} userRol={userRol} />
          <CostCard pedido={pedido} />
          <ShippingCard pedido={pedido} />
          <CommentsCard comentarios={pedido.comentarios || []} pedidoId={pedido.id} />
        </div>
      </div>

      {/* Modal cambio de estado */}
      <ChangeStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        pedidoId={pedido.id}
        estadoActual={pedido.estado_interno}
      />

      {/* Modal cancelación */}
      <CancelarPedidoModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        pedido={pedido}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
