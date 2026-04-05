"use client"

import { useDraggable } from "@dnd-kit/core"
import { Card } from "@/components/ui/card"
import { PrioridadBadge, TipoBadge } from "@/components/shared/status-badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "lucide-react"
import Link from "next/link"

interface KanbanCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedido: any
  isDragging?: boolean
}

export function KanbanCard({ pedido, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: pedido.id,
  })

  const sinClasificar = !pedido.tipo || pedido.tipo === "sin_clasificar"

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Link href={`/pedidos/${pedido.id}`}>
        <Card
          className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
            isDragging ? "opacity-50 shadow-lg" : ""
          } ${sinClasificar ? "border-dashed border-amber-300" : ""}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">
                {pedido.numero_tn || `#${pedido.id.slice(0, 8)}`}
              </span>
              <TipoBadge tipo={pedido.tipo || "sin_clasificar"} />
            </div>
            <PrioridadBadge prioridad={pedido.prioridad} />
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {pedido.cliente?.nombre || "Sin cliente"}
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {pedido.tienda?.canal && (
              <span className={`font-medium ${pedido.tienda.canal === "mayorista" ? "text-blue-600" : "text-emerald-600"}`}>
                {pedido.tienda.canal === "mayorista" ? "MAY" : "MIN"}
              </span>
            )}
            {pedido.fecha_comprometida && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(pedido.fecha_comprometida), "dd/MM", { locale: es })}
              </span>
            )}
          </div>
        </Card>
      </Link>
    </div>
  )
}
