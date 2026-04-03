"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { KANBAN_COLUMNS, ESTADOS_INTERNOS } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { actualizarEstadoPedido } from "@/lib/actions/pedidos"
import { toast } from "sonner"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface KanbanBoardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedidos: any[]
}

export function KanbanBoard({ pedidos: initialPedidos }: KanbanBoardProps) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activePedido, setActivePedido] = useState<any>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const pedido = pedidos.find((p) => p.id === event.active.id)
    setActivePedido(pedido)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActivePedido(null)

    if (!over) return

    const pedidoId = active.id as string
    const nuevoEstado = over.id as EstadoInterno

    const pedido = pedidos.find((p) => p.id === pedidoId)
    if (!pedido || pedido.estado_interno === nuevoEstado) return

    // Optimistic update
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId ? { ...p, estado_interno: nuevoEstado } : p
      )
    )

    try {
      await actualizarEstadoPedido(pedidoId, nuevoEstado)
      toast.success(`Pedido movido a ${ESTADOS_INTERNOS[nuevoEstado].label}`)
    } catch {
      // Revert on error
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? { ...p, estado_interno: pedido.estado_interno } : p
        )
      )
      toast.error("Error al cambiar el estado")
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4" style={{ minWidth: `${KANBAN_COLUMNS.length * 280}px` }}>
          {KANBAN_COLUMNS.map((estado) => {
            const columnPedidos = pedidos.filter((p) => p.estado_interno === estado)
            return (
              <KanbanColumn
                key={estado}
                estado={estado}
                pedidos={columnPedidos}
                count={columnPedidos.length}
              />
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activePedido ? <KanbanCard pedido={activePedido} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
