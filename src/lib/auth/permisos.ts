export const ROL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  admin: { label: 'Admin', bg: 'bg-red-50', text: 'text-red-700' },
  operaciones: { label: 'Operaciones', bg: 'bg-blue-50', text: 'text-blue-700' },
  diseno: { label: 'Diseno', bg: 'bg-violet-50', text: 'text-violet-700' },
  armado: { label: 'Armado', bg: 'bg-amber-50', text: 'text-amber-700' },
  contable: { label: 'Contable', bg: 'bg-green-50', text: 'text-green-700' },
  logistica: { label: 'Logistica', bg: 'bg-teal-50', text: 'text-teal-700' },
  lectura: { label: 'Lectura', bg: 'bg-stone-100', text: 'text-stone-500' },
}

export const MENU_POR_ROL: Record<string, string[]> = {
  admin: ['Dashboard', 'Operaciones', 'Pedidos', 'Tareas', 'Productos', 'Clientes', 'Pagos', 'Proveedores', 'Compras', 'Gastos', 'Insumos', 'Marketing', 'Finanzas', 'Configuracion'],
  operaciones: ['Dashboard', 'Operaciones', 'Pedidos', 'Tareas', 'Productos', 'Clientes', 'Proveedores', 'Compras', 'Insumos'],
  diseno: ['Tareas', 'Productos'],
  armado: ['Tareas'],
  contable: ['Dashboard', 'Pedidos', 'Pagos', 'Compras', 'Gastos', 'Finanzas', 'Proveedores', 'Insumos', 'Productos'],
  logistica: ['Pedidos', 'Tareas', 'Clientes'],
  lectura: ['Dashboard', 'Operaciones', 'Pedidos', 'Productos', 'Clientes', 'Proveedores', 'Compras', 'Insumos'],
}

export const ROL_DESCRIPCIONES: Record<string, string> = {
  admin: 'Acceso total. Ve costos, finanzas, configura la app y gestiona usuarios.',
  operaciones: 'Gestiona pedidos, tareas, compras, proveedores e insumos. No ve costos ni finanzas.',
  diseno: 'Ve sus tareas de diseno y los pedidos vinculados. No ve montos ni finanzas.',
  armado: 'Ve solo sus tareas de armado. Vista minima, sin acceso a montos.',
  contable: 'Ve finanzas, costos, asientos y estado de resultados. No gestiona pedidos ni tareas.',
  logistica: 'Ve pedidos listos para despachar, gestiona envios. No ve costos.',
  lectura: 'Solo lectura de toda la app excepto costos y finanzas.',
}

export function puedeVerModulo(rol: string, modulo: string): boolean {
  if (rol === 'admin') return true
  return MENU_POR_ROL[rol]?.includes(modulo) || false
}

export function puedeVerCostos(rol: string): boolean {
  return ['admin', 'contable'].includes(rol)
}

export function puedeVerFinanzas(rol: string): boolean {
  return ['admin', 'contable'].includes(rol)
}

export function puedeVerMontos(rol: string): boolean {
  return !['armado', 'diseno'].includes(rol)
}

export function puedeEditarPedidos(rol: string): boolean {
  return rol === 'admin'
}
