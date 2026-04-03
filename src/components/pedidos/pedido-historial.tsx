"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { EstadoBadge } from "@/components/shared/status-badge"
import type { EstadoInterno } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PedidoHistorial({ historial }: { historial: any[] }) {
  if (historial.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay registros en el historial
        </CardContent>
      </Card>
    )
  }

  const sorted = [...historial].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="relative">
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {sorted.map((entry) => (
              <div key={entry.id} className="flex gap-3 relative">
                <div className="h-[30px] w-[30px] rounded-full bg-muted border flex items-center justify-center shrink-0 z-10">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium">{entry.accion}</p>
                  {entry.estado_anterior && entry.estado_nuevo && (
                    <div className="flex items-center gap-2 mt-1">
                      <EstadoBadge estado={entry.estado_anterior as EstadoInterno} />
                      <span className="text-xs text-muted-foreground">→</span>
                      <EstadoBadge estado={entry.estado_nuevo as EstadoInterno} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.usuario?.nombre || "Sistema"} —{" "}
                    {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
