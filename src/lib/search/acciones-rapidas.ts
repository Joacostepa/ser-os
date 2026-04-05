export interface AccionRapida {
  titulo: string
  keywords: string[]
  url?: string
  accion?: string
  icono: string
}

export const ACCIONES_RAPIDAS: AccionRapida[] = [
  // Acciones de creación
  { titulo: "Nuevo pedido manual", keywords: ["nuevo pedido", "crear pedido", "pedido manual"], url: "/pedidos/nuevo", icono: "Plus" },
  { titulo: "Registrar gasto", keywords: ["nuevo gasto", "registrar gasto"], url: "/gastos", icono: "Receipt" },
  { titulo: "Nueva orden de compra", keywords: ["nueva oc", "orden de compra", "compra nueva"], url: "/compras/nueva", icono: "FileText" },
  { titulo: "Crear cliente", keywords: ["nuevo cliente", "crear cliente", "cliente nuevo"], url: "/clientes", icono: "UserPlus" },
  // Navegación a módulos
  { titulo: "Ir al Dashboard", keywords: ["dashboard", "inicio", "home"], url: "/", icono: "LayoutDashboard" },
  { titulo: "Ir a Operaciones", keywords: ["operaciones", "kanban", "tablero"], url: "/operaciones", icono: "Zap" },
  { titulo: "Ir a Pedidos", keywords: ["pedidos", "ventas", "ordenes"], url: "/pedidos", icono: "Package" },
  { titulo: "Ir a Tareas", keywords: ["tareas", "mi día", "pendientes"], url: "/tareas", icono: "CheckSquare" },
  { titulo: "Ir a Productos", keywords: ["productos", "catalogo", "artículos"], url: "/productos", icono: "ShoppingBag" },
  { titulo: "Ir a Clientes", keywords: ["clientes", "clientas"], url: "/clientes", icono: "User" },
  { titulo: "Ir a Pagos", keywords: ["pagos", "cobros"], url: "/pagos", icono: "DollarSign" },
  { titulo: "Ir a Proveedores", keywords: ["proveedores"], url: "/proveedores", icono: "Building" },
  { titulo: "Ir a Compras", keywords: ["compras", "ordenes de compra"], url: "/compras", icono: "FileText" },
  { titulo: "Ir a Gastos", keywords: ["gastos", "egresos"], url: "/gastos", icono: "Receipt" },
  { titulo: "Ir a Insumos", keywords: ["insumos", "materiales", "stock"], url: "/insumos", icono: "Layers" },
  { titulo: "Ir a Marketing", keywords: ["marketing", "club ser", "fidelización", "cupones"], url: "/marketing", icono: "Zap" },
  { titulo: "Ir a Finanzas", keywords: ["finanzas", "resultados", "balance", "contable"], url: "/finanzas", icono: "DollarSign" },
  { titulo: "Ir a Configuración", keywords: ["config", "configuración", "ajustes"], url: "/configuracion", icono: "Settings" },
  { titulo: "Sincronizar pedidos con TN", keywords: ["sincronizar", "importar pedidos", "tienda nube"], url: "/configuracion/integracion", icono: "RefreshCw" },
]

export function filtrarAcciones(query: string): AccionRapida[] {
  if (!query) return ACCIONES_RAPIDAS.slice(0, 4)
  const q = query.toLowerCase()
  return ACCIONES_RAPIDAS.filter(
    (a) => a.keywords.some((k) => k.includes(q)) || a.titulo.toLowerCase().includes(q)
  )
}
