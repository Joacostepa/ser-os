"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  ExternalLink,
} from "lucide-react"
import { completarTarea } from "@/lib/actions/tareas"
import { toast } from "sonner"
import Link from "next/link"

const ESTADO_ICONS = {
  pendiente: { icon: Circle, color: "text-gray-400", label: "Pendiente" },
  en_proceso: { icon: Clock, color: "text-blue-500", label: "En proceso" },
  terminada: { icon: CheckCircle2, color: "text-green-500", label: "Terminada" },
  bloqueada: { icon: Lock, color: "text-red-400", label: "Bloqueada" },
}

export default function TareasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tareas, setTareas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroArea, setFiltroArea] = useState("todos")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchTareas() {
      setLoading(true)
      let query = supabase
        .from("tareas")
        .select(`
          *,
          pedido:pedidos(id, numero_tn, tipo, prioridad, cliente:clientes(nombre)),
          responsable:usuarios(id, nombre)
        `)
        .order("created_at", { ascending: false })

      if (filtroEstado !== "todos") {
        query = query.eq("estado", filtroEstado)
      }
      if (filtroArea !== "todos") {
        query = query.eq("area", filtroArea)
      }

      const { data } = await query
      setTareas(data || [])
      setLoading(false)
    }

    fetchTareas()
  }, [filtroEstado, filtroArea])

  async function handleCompletar(tareaId: string) {
    try {
      await completarTarea(tareaId)
      toast.success("Tarea completada")
      // Re-fetch
      setTareas((prev) =>
        prev.map((t) => (t.id === tareaId ? { ...t, estado: "terminada" } : t))
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Tareas</h1>
        <p className="text-sm text-muted-foreground">
          Todas las tareas operativas del sistema
        </p>
      </div>

      <div className="flex gap-2">
        <Select value={filtroEstado} onValueChange={(v) => v && setFiltroEstado(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="terminada">Terminada</SelectItem>
            <SelectItem value="bloqueada">Bloqueada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroArea} onValueChange={(v) => v && setFiltroArea(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las áreas</SelectItem>
            <SelectItem value="diseno">Diseño</SelectItem>
            <SelectItem value="operaciones">Operaciones</SelectItem>
            <SelectItem value="armado">Armado</SelectItem>
            <SelectItem value="logistica">Logística</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tareas.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay tareas que coincidan con los filtros
              </CardContent>
            </Card>
          )}

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tareas.map((tarea: any) => {
            const config = ESTADO_ICONS[tarea.estado as keyof typeof ESTADO_ICONS]
            const Icon = config.icon

            return (
              <Card key={tarea.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${tarea.estado === "terminada" ? "line-through opacity-60" : ""}`}>
                      {tarea.titulo}
                    </p>
                    {tarea.pedido && (
                      <Link
                        href={`/pedidos/${tarea.pedido.id}`}
                        className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                      >
                        Pedido {tarea.pedido.numero_tn || `#${tarea.pedido.id.slice(0, 8)}`}
                        {" — "}
                        {tarea.pedido.cliente?.nombre}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  <Badge variant="secondary" className="text-xs capitalize">
                    {tarea.area}
                  </Badge>

                  {tarea.responsable && (
                    <span className="text-xs text-muted-foreground">
                      {tarea.responsable.nombre}
                    </span>
                  )}

                  {tarea.estado === "pendiente" || tarea.estado === "en_proceso" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleCompletar(tarea.id)}
                    >
                      Completar
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
