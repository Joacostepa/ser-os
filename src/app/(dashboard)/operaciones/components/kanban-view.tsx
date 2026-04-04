"use client"

import { KanbanCard } from "./kanban-card"
import { Package, Clock, Wrench, PackageCheck, Truck } from "lucide-react"
import type { EstadoInterno } from "@/types/database"

const COLUMNS = [
  { id: "nuevos", label: "Nuevos", color: "#a8a29e", icon: Package, estados: ["nuevo"] },
  { id: "sena", label: "Pendiente seña", color: "#f59e0b", icon: Clock, estados: ["pendiente_sena"] },
  { id: "prearmado", label: "Pre-armado", color: "#3b82f6", icon: Wrench, estados: ["sena_recibida", "en_prearmado", "esperando_insumos", "esperando_diseno", "insumos_recibidos", "listo_para_armar"] },
  { id: "armado", label: "Armado", color: "#8b5cf6", icon: PackageCheck, estados: ["en_armado", "armado_completo"] },
  { id: "despacho", label: "Despacho", color: "#16a34a", icon: Truck, estados: ["pendiente_saldo", "listo_para_despacho", "en_preparacion_envio"] },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function KanbanView({ pedidos, onPedidoClick }: { pedidos: any[]; onPedidoClick: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ height: "calc(100vh - 200px)" }}>
      {COLUMNS.map((col) => {
        const pedidosCol = pedidos.filter((p) => col.estados.includes(p.estado_interno as EstadoInterno))
        const Icon = col.icon

        return (
          <div key={col.id} className="w-[280px] min-w-[280px] flex flex-col">
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2 mb-2" style={{ borderBottom: `2px solid ${col.color}` }}>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />
                <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{col.label}</span>
              </div>
              <span className="text-xs font-medium font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                {pedidosCol.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto px-1 space-y-0">
              {pedidosCol.map((p) => (
                <KanbanCard key={p.id} pedido={p} onClick={() => onPedidoClick(p.id)} />
              ))}
              {pedidosCol.length === 0 && (
                <p className="text-xs text-stone-300 text-center py-8">Sin pedidos</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
