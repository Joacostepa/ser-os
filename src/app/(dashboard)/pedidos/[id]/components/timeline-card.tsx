import { DashboardCard } from "@/components/reportes/dashboard-card"
import { formatearTiempoRelativo } from "@/lib/formatters"

const EVENT_COLORS: Record<string, string> = {
  estado: "bg-[#378ADD]",
  tarea: "bg-[#639922]",
  pago: "bg-[#EF9F27]",
  comentario: "bg-[#888780]",
  archivo: "bg-[#888780]",
  creacion: "bg-[#888780]",
  bloqueada: "bg-[#E24B4A]",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TimelineCard({ pedido }: { pedido: any }) {
  // Combine events from different sources
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: { tipo: string; texto: string; fecha: string; usuario?: string }[] = []

  // Historial de estados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedido.historial?.forEach((h: any) => {
    events.push({
      tipo: "estado",
      texto: h.accion || `Estado: ${h.estado_anterior || "—"} → ${h.estado_nuevo || "—"}`,
      fecha: h.created_at,
      usuario: h.usuario?.nombre,
    })
  })

  // Tareas completadas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedido.tareas?.filter((t: any) => t.estado === "terminada" && t.completada_en).forEach((t: any) => {
    events.push({
      tipo: "tarea",
      texto: `Tarea completada: "${t.titulo}"`,
      fecha: t.completada_en,
      usuario: t.responsable?.nombre,
    })
  })

  // Pagos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedido.pagos?.forEach((p: any) => {
    events.push({
      tipo: "pago",
      texto: `Pago recibido: $${Number(p.monto).toLocaleString("es-AR")} (${p.metodo})`,
      fecha: p.fecha || p.created_at,
    })
  })

  // Comentarios
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedido.comentarios?.forEach((c: any) => {
    events.push({
      tipo: "comentario",
      texto: `Comentario: "${c.contenido.slice(0, 80)}${c.contenido.length > 80 ? "..." : ""}"`,
      fecha: c.created_at,
      usuario: c.usuario?.nombre,
    })
  })

  // Sort desc
  events.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  const visibleEvents = events.slice(0, 10)

  return (
    <DashboardCard title="Historial y timeline">
      {visibleEvents.length > 0 ? (
        <div className="space-y-0">
          {visibleEvents.map((ev, i) => (
            <div key={i} className="flex gap-3 py-2 border-b border-muted last:border-0">
              <div className="flex flex-col items-center mt-1.5">
                <div className={`h-2 w-2 rounded-full shrink-0 ${EVENT_COLORS[ev.tipo] || EVENT_COLORS.creacion}`} />
                {i < visibleEvents.length - 1 && <div className="w-px flex-1 bg-muted mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{ev.texto}</p>
                <p className="text-[11px] text-muted-foreground">
                  {ev.usuario && <>{ev.usuario} · </>}
                  {formatearTiempoRelativo(ev.fecha)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Sin eventos registrados</p>
      )}
    </DashboardCard>
  )
}
