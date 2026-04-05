export interface RecienteItem {
  tipo: string
  id: string
  titulo: string
  subtitulo: string
  url: string
  icono: string
  timestamp: number
}

const STORAGE_KEY = "ser-search-recientes"
const MAX_RECIENTES = 10

export function agregarReciente(item: Omit<RecienteItem, "timestamp">) {
  const recientes = getRecientes()
  const filtrados = recientes.filter((r) => !(r.tipo === item.tipo && r.id === item.id))
  filtrados.unshift({ ...item, timestamp: Date.now() })
  const limitados = filtrados.slice(0, MAX_RECIENTES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitados))
  } catch { /* ignore */ }
}

export function getRecientes(): RecienteItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}
