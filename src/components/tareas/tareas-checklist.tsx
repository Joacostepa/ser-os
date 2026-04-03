"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Play,
  User,
} from "lucide-react"
import { completarTarea, iniciarTarea } from "@/lib/actions/tareas"
import { toast } from "sonner"

const ESTADO_TAREA_ICON = {
  pendiente: { icon: Circle, color: "text-gray-400" },
  en_proceso: { icon: Clock, color: "text-blue-500" },
  terminada: { icon: CheckCircle2, color: "text-green-500" },
  bloqueada: { icon: Lock, color: "text-red-400" },
}

const AREA_COLORS: Record<string, string> = {
  diseno: "bg-purple-100 text-purple-700",
  operaciones: "bg-blue-100 text-blue-700",
  armado: "bg-amber-100 text-amber-700",
  logistica: "bg-teal-100 text-teal-700",
  admin: "bg-gray-100 text-gray-700",
}

interface TareasChecklistProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tareas: any[]
  pedidoId: string
}

export function TareasChecklist({ tareas, pedidoId }: TareasChecklistProps) {
  const router = useRouter()
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const sorted = [...tareas].sort((a, b) => a.orden - b.orden)

  async function handleCompletar(tareaId: string) {
    setLoadingIds((prev) => new Set(prev).add(tareaId))
    try {
      await completarTarea(tareaId)
      toast.success("Tarea completada")
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al completar la tarea"
      toast.error(msg)
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(tareaId)
        return next
      })
    }
  }

  async function handleIniciar(tareaId: string) {
    setLoadingIds((prev) => new Set(prev).add(tareaId))
    try {
      await iniciarTarea(tareaId)
      toast.success("Tarea iniciada")
      router.refresh()
    } catch {
      toast.error("Error al iniciar la tarea")
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(tareaId)
        return next
      })
    }
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay tareas asignadas a este pedido.
          <br />
          <span className="text-sm">Las tareas se generan automáticamente al habilitar el pedido (seña recibida).</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4 divide-y">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {sorted.map((tarea: any) => {
          const estadoConfig = ESTADO_TAREA_ICON[tarea.estado as keyof typeof ESTADO_TAREA_ICON]
          const Icon = estadoConfig.icon
          const isLoading = loadingIds.has(tarea.id)
          const isCompleted = tarea.estado === "terminada"
          const isBlocked = tarea.estado === "bloqueada"

          return (
            <div
              key={tarea.id}
              className={`flex items-center gap-3 py-3 ${isCompleted ? "opacity-60" : ""}`}
            >
              {isCompleted ? (
                <Checkbox checked disabled />
              ) : (
                <Checkbox
                  checked={false}
                  disabled={isBlocked || isLoading}
                  onCheckedChange={() => handleCompletar(tarea.id)}
                />
              )}

              <Icon className={`h-4 w-4 shrink-0 ${estadoConfig.color}`} />

              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isCompleted ? "line-through" : "font-medium"}`}>
                  {tarea.titulo}
                </p>
                {tarea.descripcion && (
                  <p className="text-xs text-muted-foreground">{tarea.descripcion}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className={`text-xs ${AREA_COLORS[tarea.area] || ""}`}>
                  {tarea.area}
                </Badge>

                {tarea.responsable && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {tarea.responsable.nombre.split(" ")[0]}
                  </span>
                )}

                {tarea.estado === "pendiente" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleIniciar(tarea.id)}
                    disabled={isLoading}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Iniciar
                  </Button>
                )}

                {isBlocked && (
                  <span className="text-xs text-red-500">Bloqueada</span>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
