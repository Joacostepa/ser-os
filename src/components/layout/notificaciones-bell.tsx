"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Check,
  Package,
  CreditCard,
  CheckCircle,
  CheckSquare,
  UserPlus,
  AlertTriangle,
  Truck,
  Repeat,
  Pencil,
  Tag,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { formatearTiempoRelativo } from "@/lib/formatters"

interface Notificacion {
  id: string
  tipo: string
  plantilla_id: string | null
  titulo: string
  mensaje: string
  leida: boolean
  recurso_tipo: string | null
  recurso_id: string | null
  created_at: string
}

const ICON_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  pedido_nuevo: { icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
  pedido_nuevo_manual: { icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
  pago_recibido: { icon: CreditCard, color: "text-green-500", bg: "bg-green-50" },
  pedido_habilitado: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  checklist_completo: { icon: CheckSquare, color: "text-green-600", bg: "bg-green-50" },
  paso_asignado: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-50" },
  pedido_estancado: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
  stock_critico: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  compra_recibida: { icon: Truck, color: "text-teal-500", bg: "bg-teal-50" },
  gasto_recurrente: { icon: Repeat, color: "text-amber-500", bg: "bg-amber-50" },
  pedido_editado: { icon: Pencil, color: "text-stone-500", bg: "bg-stone-100" },
  pedido_cancelado: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  pago_proveedor: { icon: CreditCard, color: "text-amber-500", bg: "bg-amber-50" },
  pedido_despachado: { icon: Truck, color: "text-green-500", bg: "bg-green-50" },
  pedido_sin_clasificar: { icon: Tag, color: "text-amber-500", bg: "bg-amber-50" },
}

function getNotifUrl(n: Notificacion): string {
  if (n.recurso_tipo === "pedido" && n.recurso_id) return `/pedidos/${n.recurso_id}`
  if (n.recurso_tipo === "compra" && n.recurso_id) return `/compras/${n.recurso_id}`
  if (n.recurso_tipo === "insumo" && n.recurso_id) return `/insumos/${n.recurso_id}`
  if (n.recurso_tipo === "gasto") return "/gastos"
  if (n.recurso_tipo === "tarea") return "/tareas"
  return "/"
}

function getIconConfig(tipo: string) {
  return ICON_CONFIG[tipo] || { icon: Bell, color: "text-stone-400", bg: "bg-stone-100" }
}

export function NotificacionesBell() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones/count")
      if (res.ok) {
        const data = await res.json()
        setCount(data.count)
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notificaciones?limit=10&offset=0")
      if (res.ok) {
        const data = await res.json()
        setNotificaciones(data.data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch count on mount + poll every 30s
  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open) fetchNotificaciones()
  }, [open, fetchNotificaciones])

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleBellClick = () => {
    // Mobile: navigate to full page instead of dropdown
    if (window.innerWidth < 640) {
      router.push("/notificaciones")
      return
    }
    setOpen((prev) => !prev)
  }

  const markAllRead = async () => {
    try {
      await fetch("/api/notificaciones/leer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: "all" }),
      })
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
      setCount(0)
    } catch {
      // silently fail
    }
  }

  const handleNotifClick = async (n: Notificacion) => {
    if (!n.leida) {
      try {
        await fetch("/api/notificaciones/leer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [n.id] }),
        })
        setNotificaciones((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, leida: true } : item))
        )
        setCount((prev) => Math.max(0, prev - 1))
      } catch {
        // silently fail
      }
    }
    setOpen(false)
    router.push(getNotifUrl(n))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleBellClick}
        className="text-stone-400 hover:text-stone-600 transition-colors p-1 relative"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-medium text-white">
            {count > 99 ? "99" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-sm:w-[calc(100vw-2rem)] max-sm:right-[-0.5rem] rounded-xl border border-stone-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <span className="text-sm font-medium text-stone-700">Notificaciones</span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                <Check className="h-3 w-3" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-stone-400">
                Sin notificaciones
              </div>
            ) : (
              notificaciones.map((n) => {
                const config = getIconConfig(n.plantilla_id || n.tipo)
                const Icon = config.icon
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors ${
                      !n.leida ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!n.leida && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            !n.leida ? "font-medium text-stone-800" : "text-stone-600"
                          }`}
                        >
                          {n.titulo}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">{n.mensaje}</p>
                      <span className="text-[10px] text-stone-300 mt-0.5 block">
                        {formatearTiempoRelativo(n.created_at)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-stone-100">
            <button
              onClick={() => {
                setOpen(false)
                router.push("/notificaciones")
              }}
              className="w-full px-4 py-2.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-stone-50 transition-colors text-center"
            >
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
