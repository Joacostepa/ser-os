"use client"

import { KanbanCard } from "./kanban-card"
import { Package } from "lucide-react"
import type { EstadoInterno } from "@/types/database"
import type { ConfigKanbanColumna } from "@/lib/config/tipos"

const FALLBACK_COLUMNS: ConfigKanbanColumna[] = [
  { id: 0, nombre: "Nuevos", color: "#a8a29e", icono: null, estados: ["nuevo"], colapsada: false, orden: 0 },
  { id: 1, nombre: "Pendiente seña", color: "#f59e0b", icono: null, estados: ["pendiente_de_sena"], colapsada: false, orden: 1 },
  { id: 2, nombre: "Pre-armado", color: "#3b82f6", icono: null, estados: ["habilitado", "en_prearmado", "esperando_insumos", "esperando_diseno", "insumos_recibidos", "listo_para_armar"], colapsada: false, orden: 2 },
  { id: 3, nombre: "Armado", color: "#8b5cf6", icono: null, estados: ["en_armado", "armado_completo"], colapsada: false, orden: 3 },
  { id: 4, nombre: "Despacho", color: "#16a34a", icono: null, estados: ["pendiente_de_cobro", "listo_para_despachar", "en_preparacion_envio"], colapsada: false, orden: 4 },
]

interface KanbanViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedidos: any[]
  onPedidoClick: (id: string) => void
  columnas?: ConfigKanbanColumna[]
}

export function KanbanView({ pedidos, onPedidoClick, columnas }: KanbanViewProps) {
  const columns = columnas && columnas.length > 0 ? columnas : FALLBACK_COLUMNS

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ height: "calc(100vh - 200px)" }}>
      {columns.map((col) => {
        const pedidosCol = pedidos.filter((p) => col.estados.includes(p.estado_interno as EstadoInterno))

        return (
          <div key={col.id} className="w-[280px] min-w-[280px] flex flex-col">
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2 mb-2" style={{ borderBottom: `2px solid ${col.color}` }}>
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />
                <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{col.nombre}</span>
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
