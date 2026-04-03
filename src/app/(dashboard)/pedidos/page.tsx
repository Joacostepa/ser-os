"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, List, LayoutGrid } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { pedidosColumns } from "@/components/pedidos/pedidos-table-columns"
import { PedidosFilters } from "@/components/pedidos/pedidos-filters"
import { KanbanBoard } from "@/components/pedidos/kanban-board"
import { Skeleton } from "@/components/ui/skeleton"

export default function PedidosPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "kanban">("lista")

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [estado, setEstado] = useState("")
  const [tipo, setTipo] = useState("")
  const [prioridad, setPrioridad] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function fetchPedidos() {
      setLoading(true)
      let query = supabase
        .from("pedidos")
        .select(`
          *,
          cliente:clientes(id, nombre, email, telefono),
          tienda:tiendas(id, nombre, canal)
        `)
        .order("created_at", { ascending: false })

      if (estado && estado !== "todos") {
        query = query.eq("estado_interno", estado)
      }
      if (tipo && tipo !== "todos") {
        query = query.eq("tipo", tipo)
      }
      if (prioridad && prioridad !== "todos") {
        query = query.eq("prioridad", prioridad)
      }
      if (busqueda) {
        query = query.or(`numero_tn.ilike.%${busqueda}%`)
      }

      const { data } = await query
      setPedidos(data || [])
      setLoading(false)
    }

    fetchPedidos()
  }, [estado, tipo, prioridad, busqueda])

  function clearFilters() {
    setBusqueda("")
    setEstado("")
    setTipo("")
    setPrioridad("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de pedidos mayoristas
          </p>
        </div>
        <Button onClick={() => router.push("/pedidos/nuevo")}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo pedido
        </Button>
      </div>

      <Tabs value={vista} onValueChange={(v) => setVista(v as "lista" | "kanban")}>
        <div className="flex items-center justify-between gap-4">
          <PedidosFilters
            busqueda={busqueda}
            estado={estado}
            tipo={tipo}
            prioridad={prioridad}
            onBusquedaChange={setBusqueda}
            onEstadoChange={(v) => setEstado(v || "")}
            onTipoChange={(v) => setTipo(v || "")}
            onPrioridadChange={(v) => setPrioridad(v || "")}
            onClear={clearFilters}
          />
          <TabsList>
            <TabsTrigger value="lista">
              <List className="h-4 w-4 mr-1" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="lista" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={pedidosColumns}
              data={pedidos}
              onRowClick={(row: { id: string }) => router.push(`/pedidos/${row.id}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {loading ? (
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px] w-[270px] shrink-0" />
              ))}
            </div>
          ) : (
            <KanbanBoard pedidos={pedidos} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
