export interface ConfigEtapa {
  id: number
  estado_interno: string
  label_default: string
  label_custom: string | null
  activo_logo_ser: boolean
  activo_marca_blanca: boolean
  activo_personalizado: boolean
  orden: number
  badge_color_bg: string
  badge_color_text: string
  icono: string | null
  visible_en_portal: boolean
  label_portal: string | null
}

export interface ConfigKanbanColumna {
  id: number
  nombre: string
  orden: number
  color: string
  icono: string | null
  estados: string[]
  colapsada: boolean
}

export const TIPO_PEDIDO_OPTIONS = [
  { value: "sin_clasificar", label: "Sin clasificar", bg: "bg-stone-100", text: "text-stone-500" },
  { value: "logo_ser", label: "Logo SER", bg: "bg-blue-50", text: "text-blue-700" },
  { value: "marca_blanca", label: "Marca blanca", bg: "bg-stone-100", text: "text-stone-700" },
  { value: "personalizado", label: "Personalizado", bg: "bg-violet-50", text: "text-violet-700" },
] as const

export type TipoPedidoValue = (typeof TIPO_PEDIDO_OPTIONS)[number]["value"]

/** Estados que no se pueden desactivar en ningún tipo */
export const ESTADOS_OBLIGATORIOS = [
  "nuevo",
  "habilitado",
  "en_prearmado",
  "en_armado",
  "armado_completo",
  "listo_para_despachar",
  "despachado",
  "entregado",
] as const

/** Estados de sistema que no aparecen en la lista configurable */
export const ESTADOS_SISTEMA = ["bloqueado", "cancelado", "cerrado"] as const

/** Colors for kanban column picker */
export const KANBAN_COLUMN_COLORS = [
  { name: "grey", value: "#a8a29e" },
  { name: "blue", value: "#3b82f6" },
  { name: "violet", value: "#8b5cf6" },
  { name: "amber", value: "#f59e0b" },
  { name: "green", value: "#16a34a" },
  { name: "teal", value: "#14b8a6" },
  { name: "red", value: "#ef4444" },
  { name: "ser", value: "#4a7c59" },
] as const
