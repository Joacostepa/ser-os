import type { EstadoInterno, Prioridad } from "@/types/database"

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  nuevo:                { bg: "bg-stone-100",  text: "text-stone-600",  label: "Nuevo" },
  pendiente_sena:       { bg: "bg-amber-50",   text: "text-amber-700",  label: "Pendiente de seña" },
  pendiente_de_sena:    { bg: "bg-amber-50",   text: "text-amber-700",  label: "Pendiente de seña" },
  sena_recibida:        { bg: "bg-blue-50",    text: "text-blue-700",   label: "Habilitado" },
  habilitado:           { bg: "bg-blue-50",    text: "text-blue-700",   label: "Habilitado" },
  en_prearmado:         { bg: "bg-blue-50",    text: "text-blue-700",   label: "En pre-armado" },
  esperando_insumos:    { bg: "bg-amber-50",   text: "text-amber-700",  label: "Esperando insumos" },
  esperando_diseno:     { bg: "bg-amber-50",   text: "text-amber-700",  label: "Esperando diseño" },
  insumos_recibidos:    { bg: "bg-blue-50",    text: "text-blue-700",   label: "Insumos recibidos" },
  bloqueado:            { bg: "bg-red-50",     text: "text-red-700",    label: "Bloqueado" },
  listo_para_armar:     { bg: "bg-blue-50",    text: "text-blue-700",   label: "Listo para armar" },
  en_armado:            { bg: "bg-violet-50",  text: "text-violet-700", label: "En armado" },
  armado_completo:      { bg: "bg-violet-50",  text: "text-violet-700", label: "Armado completo" },
  pendiente_saldo:      { bg: "bg-amber-50",   text: "text-amber-700",  label: "Pendiente de cobro" },
  pendiente_de_cobro:   { bg: "bg-amber-50",   text: "text-amber-700",  label: "Pendiente de cobro" },
  listo_para_despacho:  { bg: "bg-teal-50",    text: "text-teal-700",   label: "Listo para despachar" },
  listo_para_despachar: { bg: "bg-teal-50",    text: "text-teal-700",   label: "Listo para despachar" },
  en_preparacion_envio: { bg: "bg-teal-50",    text: "text-teal-700",   label: "En preparación" },
  despachado:           { bg: "bg-green-50",   text: "text-green-700",  label: "Despachado" },
  entregado:            { bg: "bg-green-50",   text: "text-green-800",  label: "Entregado" },
  cerrado:              { bg: "bg-stone-100",  text: "text-stone-500",  label: "Cerrado" },
  cancelado:            { bg: "bg-red-50",     text: "text-red-700",    label: "Cancelado" },
}

export function EstadoBadge({ estado }: { estado: EstadoInterno }) {
  const config = ESTADO_STYLES[estado] || { bg: "bg-stone-100", text: "text-stone-600", label: estado }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

const PRIORIDAD_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  urgente: { dot: "bg-red-500",   text: "text-red-600",   label: "Urgente" },
  normal:  { dot: "bg-stone-400", text: "text-stone-500", label: "Normal" },
  baja:    { dot: "bg-stone-300", text: "text-stone-400", label: "Baja" },
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  const config = PRIORIDAD_STYLES[prioridad] || PRIORIDAD_STYLES.normal
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

export function TipoBadge({ tipo }: { tipo: "estandar" | "personalizado" }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md ${
      tipo === "personalizado"
        ? "bg-violet-50 text-violet-700"
        : "bg-blue-50 text-blue-700"
    }`}>
      {tipo === "estandar" ? "Estándar" : "Personalizado"}
    </span>
  )
}
