import type { EstadoInterno, EstadoPublico } from "@/types/database"

export const ESTADOS_INTERNOS: Record<EstadoInterno, { label: string; color: string; bgColor: string }> = {
  nuevo: { label: "Nuevo", color: "#3B82F6", bgColor: "bg-blue-100 text-blue-800" },
  pendiente_sena: { label: "Pendiente de seña", color: "#F59E0B", bgColor: "bg-amber-100 text-amber-800" },
  sena_recibida: { label: "Seña recibida", color: "#2563EB", bgColor: "bg-blue-100 text-blue-700" },
  en_prearmado: { label: "En pre-armado", color: "#2563EB", bgColor: "bg-blue-100 text-blue-700" },
  esperando_insumos: { label: "Esperando insumos", color: "#F97316", bgColor: "bg-orange-100 text-orange-800" },
  esperando_diseno: { label: "Esperando diseño", color: "#F97316", bgColor: "bg-orange-100 text-orange-800" },
  insumos_recibidos: { label: "Insumos recibidos", color: "#22C55E", bgColor: "bg-green-100 text-green-800" },
  listo_para_armar: { label: "Listo para armar", color: "#22C55E", bgColor: "bg-green-100 text-green-800" },
  en_armado: { label: "En armado", color: "#16A34A", bgColor: "bg-green-200 text-green-900" },
  armado_completo: { label: "Armado completo", color: "#16A34A", bgColor: "bg-green-200 text-green-900" },
  pendiente_saldo: { label: "Pendiente de saldo", color: "#EF4444", bgColor: "bg-red-100 text-red-800" },
  listo_para_despacho: { label: "Listo para despacho", color: "#8B5CF6", bgColor: "bg-violet-100 text-violet-800" },
  en_preparacion_envio: { label: "En preparación de envío", color: "#8B5CF6", bgColor: "bg-violet-100 text-violet-800" },
  despachado: { label: "Despachado", color: "#6B7280", bgColor: "bg-gray-100 text-gray-700" },
  cerrado: { label: "Cerrado", color: "#374151", bgColor: "bg-gray-200 text-gray-800" },
  cancelado: { label: "Cancelado", color: "#991B1B", bgColor: "bg-red-200 text-red-900" },
}

export const ESTADOS_PUBLICOS: Record<EstadoPublico, { label: string; orden: number }> = {
  recibido: { label: "Recibido", orden: 1 },
  en_produccion: { label: "En producción", orden: 2 },
  en_diseno: { label: "En diseño", orden: 3 },
  en_preparacion: { label: "En preparación", orden: 4 },
  listo_pendiente_pago: { label: "Listo — pendiente de pago", orden: 5 },
  listo_para_envio: { label: "Listo para envío", orden: 6 },
  enviado: { label: "Enviado / Listo para retiro", orden: 7 },
  entregado: { label: "Entregado", orden: 8 },
}

// Mapeo de estado interno → estado público
export const ESTADO_INTERNO_A_PUBLICO: Record<EstadoInterno, EstadoPublico> = {
  nuevo: "recibido",
  pendiente_sena: "recibido",
  sena_recibida: "recibido",
  en_prearmado: "en_produccion",
  esperando_insumos: "en_produccion",
  esperando_diseno: "en_diseno",
  insumos_recibidos: "en_produccion",
  listo_para_armar: "en_produccion",
  en_armado: "en_produccion",
  armado_completo: "en_preparacion",
  pendiente_saldo: "listo_pendiente_pago",
  listo_para_despacho: "listo_para_envio",
  en_preparacion_envio: "listo_para_envio",
  despachado: "enviado",
  cerrado: "entregado",
  cancelado: "recibido",
}

// Estados del Kanban (columnas visibles)
export const KANBAN_COLUMNS: EstadoInterno[] = [
  "nuevo",
  "pendiente_sena",
  "sena_recibida",
  "esperando_insumos",
  "listo_para_armar",
  "en_armado",
  "pendiente_saldo",
  "listo_para_despacho",
  "despachado",
]

export const PRIORIDAD_CONFIG = {
  urgente: { label: "Urgente", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" },
  baja: { label: "Baja", color: "bg-gray-100 text-gray-600", dotColor: "bg-gray-400" },
} as const

export const CALIFICACION_PROVEEDOR_CONFIG = {
  excelente: { label: "Excelente", color: "bg-green-100 text-green-800" },
  bueno: { label: "Bueno", color: "bg-blue-100 text-blue-800" },
  regular: { label: "Regular", color: "bg-amber-100 text-amber-800" },
  malo: { label: "Malo", color: "bg-red-100 text-red-800" },
} as const

export const RUBRO_PROVEEDOR_CONFIG = {
  textil: { label: "Textil", color: "bg-indigo-100 text-indigo-800" },
  imprenta: { label: "Imprenta", color: "bg-cyan-100 text-cyan-800" },
  confeccion: { label: "Confección", color: "bg-pink-100 text-pink-800" },
  madera: { label: "Madera", color: "bg-amber-100 text-amber-800" },
  cuero: { label: "Cuero", color: "bg-orange-100 text-orange-800" },
  packaging: { label: "Packaging", color: "bg-teal-100 text-teal-800" },
  otro: { label: "Otro", color: "bg-gray-100 text-gray-600" },
} as const

export const ESTADO_COMPRA_CONFIG = {
  borrador: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  enviada: { label: "Enviada", color: "bg-blue-100 text-blue-800" },
  confirmada: { label: "Confirmada", color: "bg-indigo-100 text-indigo-800" },
  recibida_parcial: { label: "Recibida parcial", color: "bg-amber-100 text-amber-800" },
  recibida: { label: "Recibida", color: "bg-green-100 text-green-800" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800" },
} as const

export const TIPO_INSUMO_CONFIG = {
  material: { label: "Material", color: "bg-blue-100 text-blue-800" },
  servicio: { label: "Servicio", color: "bg-purple-100 text-purple-800" },
} as const

export const UNIDAD_INSUMO_CONFIG = {
  unidades: { label: "Unidades", short: "u" },
  metros: { label: "Metros", short: "m" },
  kg: { label: "Kilogramos", short: "kg" },
  rollos: { label: "Rollos", short: "rol" },
  horas: { label: "Horas", short: "hs" },
  ml: { label: "Mililitros", short: "ml" },
  litros: { label: "Litros", short: "L" },
} as const

export const TIPO_MOVIMIENTO_CONFIG = {
  entrada: { label: "Entrada", color: "bg-green-100 text-green-800", sign: "+" },
  salida: { label: "Salida", color: "bg-red-100 text-red-800", sign: "-" },
  ajuste: { label: "Ajuste", color: "bg-amber-100 text-amber-800", sign: "~" },
  devolucion: { label: "Devolución", color: "bg-blue-100 text-blue-800", sign: "+" },
} as const

export const METODOS_PAGO = [
  "Transferencia bancaria",
  "MercadoPago",
  "Efectivo",
  "Cheque",
  "Otro",
] as const

export const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Pedidos", href: "/pedidos", icon: "ShoppingCart" },
  { label: "Tareas", href: "/tareas", icon: "CheckSquare" },
  { label: "Clientes", href: "/clientes", icon: "Users" },
  { label: "Pagos", href: "/pagos", icon: "CreditCard" },
  { label: "Configuración", href: "/configuracion", icon: "Settings" },
] as const
