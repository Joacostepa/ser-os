import type { EstadoInterno } from "@/types/database"

const ETAPAS = [
  { label: "Ingreso", estados: ["nuevo"] },
  { label: "Seña", estados: ["pendiente_sena"] },
  { label: "Pre-armado", estados: ["sena_recibida", "en_prearmado", "esperando_insumos", "esperando_diseno", "insumos_recibidos", "listo_para_armar"] },
  { label: "Armado", estados: ["en_armado", "armado_completo"] },
  { label: "Despacho", estados: ["pendiente_saldo", "listo_para_despacho", "en_preparacion_envio"] },
  { label: "Entregado", estados: ["despachado", "cerrado"] },
]

function getEtapaIndex(estado: EstadoInterno): number {
  return ETAPAS.findIndex((e) => e.estados.includes(estado))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProgressBarComponent({ pedido }: { pedido: any }) {
  const tareasCompletadas = pedido.tareas?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.estado === "terminada"
  ).length ?? 0
  const tareasTotal = pedido.tareas?.length ?? 0
  const porcentaje = tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0

  const etapaActual = getEtapaIndex(pedido.estado_interno)

  if (pedido.estado_interno === "cancelado") {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center text-red-700 font-medium">
        Pedido cancelado
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra de progreso */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progreso del pedido</span>
        <span className="font-medium text-foreground">{tareasCompletadas} de {tareasTotal} tareas completadas</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[#378ADD] transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Stepper */}
      <div className="flex gap-1">
        {ETAPAS.map((etapa, idx) => {
          let bg: string
          let text: string

          if (idx < etapaActual) {
            // Completada
            bg = "bg-[#639922]"
            text = "text-white"
          } else if (idx === etapaActual) {
            // Actual
            bg = "bg-[#378ADD]"
            text = "text-white"
          } else {
            // Futura
            bg = "bg-muted"
            text = "text-muted-foreground"
          }

          return (
            <div
              key={etapa.label}
              className={`flex-1 h-7 rounded-md flex items-center justify-center text-[10px] font-medium ${bg} ${text}`}
            >
              {etapa.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
