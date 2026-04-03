"use client"

import { useDroppable } from "@dnd-kit/core"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"
import { KanbanCard } from "./kanban-card"
import { Badge } from "@/components/ui/badge"

interface KanbanColumnProps {
  estado: EstadoInterno
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedidos: any[]
  count: number
}

export function KanbanColumn({ estado, pedidos, count }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  const config = ESTADOS_INTERNOS[estado]

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[270px] shrink-0 flex-col rounded-lg border bg-muted/30 ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <div className="flex items-center gap-2 p-3 border-b">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-medium flex-1">{config.label}</span>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 p-2 min-h-[100px]">
        {pedidos.map((pedido) => (
          <KanbanCard key={pedido.id} pedido={pedido} />
        ))}
      </div>
    </div>
  )
}
