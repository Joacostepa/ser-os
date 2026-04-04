"use client"

import { useEffect, useState } from "react"
import { Toolbar, type Vista } from "./components/toolbar"
import { KanbanView } from "./components/kanban-view"
import { ListView } from "./components/list-view"
import { DetailPanel } from "./components/detail-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { getPedidosOperaciones } from "@/lib/actions/operaciones"
import { getKanbanColumnas } from "@/lib/config/etapas"
import type { ConfigKanbanColumna } from "@/lib/config/tipos"

export default function OperacionesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPedido, setSelectedPedido] = useState<string | null>(null)
  const [columnas, setColumnas] = useState<ConfigKanbanColumna[]>([])

  // Filters
  const [vista, setVista] = useState<Vista>("kanban")
  const [busqueda, setBusqueda] = useState("")
  const [estado, setEstado] = useState("todos")
  const [tipo, setTipo] = useState("todos")
  const [prioridad, setPrioridad] = useState("todos")

  useEffect(() => {
    getKanbanColumnas().then(setColumnas).catch(() => setColumnas([]))
  }, [])

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const data = await getPedidosOperaciones({
          estado: estado !== "todos" ? estado : undefined,
          tipo: tipo !== "todos" ? tipo : undefined,
          prioridad: prioridad !== "todos" ? prioridad : undefined,
          busqueda: busqueda || undefined,
        })
        setPedidos(data)
      } catch {
        setPedidos([])
      }
      setLoading(false)
    }
    fetch()
  }, [estado, tipo, prioridad, busqueda])

  function handlePedidoClick(id: string) {
    setSelectedPedido(id)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Operaciones</h1>
        <p className="text-sm text-stone-400">Centro de trabajo operativo</p>
      </div>

      <Toolbar
        busqueda={busqueda} onBusquedaChange={setBusqueda}
        estado={estado} onEstadoChange={setEstado}
        tipo={tipo} onTipoChange={setTipo}
        prioridad={prioridad} onPrioridadChange={setPrioridad}
        vista={vista} onVistaChange={setVista}
      />

      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-[280px] shrink-0 rounded-xl" />
          ))}
        </div>
      ) : vista === "kanban" ? (
        <KanbanView pedidos={pedidos} onPedidoClick={handlePedidoClick} columnas={columnas} />
      ) : (
        <ListView pedidos={pedidos} onPedidoClick={handlePedidoClick} />
      )}

      <DetailPanel
        pedidoId={selectedPedido}
        onClose={() => setSelectedPedido(null)}
      />
    </div>
  )
}
