"use client"

import { useState } from "react"
import { OrderHeader } from "./components/order-header"
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
import { TareasChecklist } from "@/components/tareas/tareas-checklist"
import { DashboardCard } from "@/components/reportes/dashboard-card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PedidoDetailView({ pedido }: { pedido: any }) {
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  const tareasCompletadas = pedido.tareas?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.estado === "terminada"
  ).length ?? 0
  const tareasTotal = pedido.tareas?.length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <OrderHeader pedido={pedido} onAvanzarEstado={() => setStatusModalOpen(true)} />

      {/* Alertas */}
      <AlertBar pedido={pedido} />

      {/* Barra de progreso */}
      <ProgressBarComponent pedido={pedido} />

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Columna izquierda — principal */}
        <div className="space-y-6">
          {/* Tareas */}
          <DashboardCard title={`Tareas del pedido`} description={`${tareasCompletadas}/${tareasTotal} completadas`}>
            <TareasChecklist tareas={pedido.tareas || []} pedidoId={pedido.id} />
          </DashboardCard>

          {/* Productos */}
          <ProductsCard items={pedido.items || []} montoTotal={Number(pedido.monto_total)} />

          {/* Timeline */}
          <TimelineCard pedido={pedido} />
        </div>

        {/* Columna derecha — sidebar */}
        <div className="space-y-5">
          <ClientCard cliente={pedido.cliente} />
          <PaymentsCard pedido={pedido} />
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
    </div>
  )
}
