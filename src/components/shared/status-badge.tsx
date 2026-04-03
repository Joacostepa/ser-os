import { Badge } from "@/components/ui/badge"
import { ESTADOS_INTERNOS, PRIORIDAD_CONFIG } from "@/lib/constants"
import type { EstadoInterno, Prioridad } from "@/types/database"

export function EstadoBadge({ estado }: { estado: EstadoInterno }) {
  const config = ESTADOS_INTERNOS[estado]
  return (
    <Badge variant="secondary" className={config.bgColor}>
      {config.label}
    </Badge>
  )
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  const config = PRIORIDAD_CONFIG[prioridad]
  return (
    <Badge variant="secondary" className={config.color}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  )
}

export function TipoBadge({ tipo }: { tipo: "estandar" | "personalizado" }) {
  return (
    <Badge variant="outline" className={tipo === "personalizado" ? "border-purple-300 text-purple-700" : ""}>
      {tipo === "estandar" ? "Estándar" : "Personalizado"}
    </Badge>
  )
}
