export interface AccionRapida {
  titulo: string
  keywords: string[]
  url?: string
  accion?: string
  icono: string
}

export const ACCIONES_RAPIDAS: AccionRapida[] = [
  { titulo: "Nuevo pedido manual", keywords: ["nuevo pedido", "crear pedido", "pedido manual", "pedido"], url: "/pedidos/nuevo", icono: "Plus" },
  { titulo: "Registrar gasto", keywords: ["nuevo gasto", "registrar gasto", "gasto"], url: "/gastos", icono: "Receipt" },
  { titulo: "Nueva orden de compra", keywords: ["nueva oc", "orden de compra", "compra nueva"], url: "/compras/nueva", icono: "FileText" },
  { titulo: "Crear cliente", keywords: ["nuevo cliente", "crear cliente", "cliente nuevo"], url: "/clientes", icono: "UserPlus" },
  { titulo: "Ir al Dashboard", keywords: ["dashboard", "inicio", "home"], url: "/", icono: "LayoutDashboard" },
  { titulo: "Ir al Kanban", keywords: ["kanban", "operaciones", "tablero"], url: "/operaciones", icono: "Columns" },
  { titulo: "Ir a mis tareas", keywords: ["tareas", "mi día", "pendientes"], url: "/tareas", icono: "CheckSquare" },
  { titulo: "Ir a finanzas", keywords: ["finanzas", "resultados", "balance"], url: "/finanzas", icono: "DollarSign" },
  { titulo: "Ir a configuración", keywords: ["config", "configuración", "ajustes"], url: "/configuracion", icono: "Settings" },
  { titulo: "Sincronizar pedidos con TN", keywords: ["sincronizar", "importar pedidos", "tienda nube"], url: "/configuracion/integracion", icono: "RefreshCw" },
]

export function filtrarAcciones(query: string): AccionRapida[] {
  if (!query) return ACCIONES_RAPIDAS.slice(0, 4)
  const q = query.toLowerCase()
  return ACCIONES_RAPIDAS.filter(
    (a) => a.keywords.some((k) => k.includes(q)) || a.titulo.toLowerCase().includes(q)
  )
}
