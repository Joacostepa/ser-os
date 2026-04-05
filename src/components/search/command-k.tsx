"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Package,
  User,
  ShoppingBag,
  Building,
  Layers,
  FileText,
  Plus,
  Receipt,
  UserPlus,
  LayoutDashboard,
  Columns,
  CheckSquare,
  DollarSign,
  Settings,
  RefreshCw,
  Zap,
  Clock,
  Loader2,
} from "lucide-react"
import { filtrarAcciones, type AccionRapida } from "@/lib/search/acciones-rapidas"
import { getRecientes, agregarReciente, type RecienteItem } from "@/lib/search/recientes"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  User,
  ShoppingBag,
  Building,
  Layers,
  FileText,
  Plus,
  Receipt,
  UserPlus,
  LayoutDashboard,
  Columns,
  CheckSquare,
  DollarSign,
  Settings,
  RefreshCw,
  Zap,
  Clock,
}

const GROUP_LABELS: Record<string, string> = {
  acciones: "Acciones rápidas",
  recientes: "Recientes",
  pedidos: "Pedidos",
  clientes: "Clientes",
  productos: "Productos",
  proveedores: "Proveedores",
  insumos: "Insumos",
  compras: "Compras",
}

interface ResultItem {
  tipo: string
  id: string
  titulo: string
  subtitulo: string
  url: string
  icono: string
}

interface CommandKProps {
  open: boolean
  onClose: () => void
}

export function CommandK({ open, onClose }: CommandKProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<Record<string, ResultItem[]>>({})
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setDebouncedQuery("")
      setResults({})
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Fetch results
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/api/buscar?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data.resultados || {})
          setSelectedIndex(0)
        }
      })
      .catch(() => {
        if (!cancelled) setResults({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  // Build flat items list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: { tipo: string; item: ResultItem | AccionRapida | RecienteItem }[] = []

    if (!debouncedQuery || debouncedQuery.length < 2) {
      // Show acciones + recientes
      const acciones = filtrarAcciones(query)
      for (const a of acciones) {
        items.push({
          tipo: "acciones",
          item: { tipo: "acciones", id: a.titulo, titulo: a.titulo, subtitulo: "", url: a.url || "", icono: a.icono } as ResultItem,
        })
      }
      const recientes = getRecientes()
      for (const r of recientes) {
        items.push({ tipo: "recientes", item: r as unknown as ResultItem })
      }
    } else {
      for (const [tipo, list] of Object.entries(results)) {
        for (const item of list) {
          items.push({ tipo, item: item as ResultItem })
        }
      }
    }

    return items
  }, [query, debouncedQuery, results])

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [flatItems.length])

  // Navigate to item
  const navigateTo = useCallback(
    (item: ResultItem | AccionRapida | RecienteItem, tipo: string) => {
      const url = "url" in item ? item.url : undefined
      if (!url) return

      // Add to recientes if it's a search result
      if (tipo !== "acciones" && tipo !== "recientes" && "id" in item) {
        agregarReciente({
          tipo: (item as ResultItem).tipo,
          id: (item as ResultItem).id,
          titulo: item.titulo,
          subtitulo: (item as ResultItem).subtitulo || "",
          url,
          icono: (item as ResultItem).icono || "Package",
        })
      }

      onClose()
      router.push(url)
    },
    [onClose, router]
  )

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(flatItems.length - 1, 0) : prev - 1
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (flatItems[selectedIndex]) {
          navigateTo(flatItems[selectedIndex].item, flatItems[selectedIndex].tipo)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [flatItems, selectedIndex, navigateTo, onClose]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector("[data-selected='true']")
    if (selected) {
      selected.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  if (!open) return null

  // Build grouped display
  const groups: { tipo: string; items: { item: ResultItem | AccionRapida | RecienteItem; globalIndex: number }[] }[] = []
  let currentGroup = ""
  let globalIdx = 0

  for (const fi of flatItems) {
    if (fi.tipo !== currentGroup) {
      groups.push({ tipo: fi.tipo, items: [] })
      currentGroup = fi.tipo
    }
    groups[groups.length - 1].items.push({ item: fi.item, globalIndex: globalIdx })
    globalIdx++
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] md:top-[20%] md:w-[560px] md:max-h-[480px] bg-white rounded-xl border border-stone-200 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
          {loading ? (
            <Loader2 className="w-5 h-5 text-stone-400 animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-stone-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pedidos, clientes, productos..."
            className="flex-1 text-base text-stone-800 placeholder:text-stone-400 outline-none border-none bg-transparent"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[380px] py-2">
          {groups.length === 0 && debouncedQuery.length >= 2 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-stone-400">
              No se encontraron resultados para &quot;{debouncedQuery}&quot;
            </div>
          )}

          {groups.map((group) => (
            <div key={group.tipo}>
              <div className="text-[10px] uppercase tracking-widest text-stone-400 font-medium px-4 pt-3 pb-1">
                {GROUP_LABELS[group.tipo] || group.tipo}
              </div>
              {group.items.map(({ item, globalIndex }) => {
                const IconComp = ICONS[(item as ResultItem).icono || "Package"] || Package
                const isSelected = globalIndex === selectedIndex

                return (
                  <button
                    key={`${group.tipo}-${"id" in item ? item.id : item.titulo}`}
                    data-selected={isSelected}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer w-full text-left transition-colors ${
                      isSelected ? "bg-stone-50" : "hover:bg-stone-50"
                    }`}
                    onClick={() => navigateTo(item, group.tipo)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                      {group.tipo === "recientes" ? (
                        <Clock className="w-4 h-4 text-stone-500" />
                      ) : group.tipo === "acciones" ? (
                        <Zap className="w-4 h-4 text-stone-500" />
                      ) : (
                        <IconComp className="w-4 h-4 text-stone-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-stone-800 truncate">
                        {item.titulo}
                      </div>
                      {"subtitulo" in item && item.subtitulo && (
                        <div className="text-xs text-stone-400 mt-0.5 truncate">
                          {item.subtitulo}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-4 py-2.5 border-t border-stone-100 text-[11px] text-stone-400">
          <span>
            <kbd className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-mono">↑↓</kbd> navegar
          </span>
          <span>
            <kbd className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-mono">↵</kbd> abrir
          </span>
          <span>
            <kbd className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-mono">esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
