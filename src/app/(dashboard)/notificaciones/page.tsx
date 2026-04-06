"use client"

import { useState, useEffect, useCallback } from "react"
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
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

function groupByDate(notificaciones: Notificacion[]): { label: string; items: Notificacion[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekStart = new Date(today.getTime() - today.getDay() * 86_400_000)

  const groups: Record<string, Notificacion[]> = {}
  const groupOrder: string[] = []

  for (const n of notificaciones) {
    const d = new Date(n.created_at)
    const nDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label: string

    if (nDate.getTime() === today.getTime()) {
      label = "Hoy"
    } else if (nDate.getTime() === yesterday.getTime()) {
      label = "Ayer"
    } else if (nDate.getTime() >= weekStart.getTime()) {
      label = "Esta semana"
    } else {
      label = d.toLocaleDateString("es-AR", { day: "numeric", month: "long" })
    }

    if (!groups[label]) {
      groups[label] = []
      groupOrder.push(label)
    }
    groups[label].push(n)
  }

  return groupOrder.map((label) => ({ label, items: groups[label] }))
}

export default function NotificacionesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"todas" | "no_leidas">("todas")
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  const fetchNotificaciones = useCallback(
    async (newOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const params = new URLSearchParams({
          limit: String(LIMIT),
          offset: String(newOffset),
        })
        if (tab === "no_leidas") params.set("leida", "false")

        const res = await fetch(`/api/notificaciones?${params}`)
        if (res.ok) {
          const data = await res.json()
          if (append) {
            setNotificaciones((prev) => [...prev, ...data.data])
          } else {
            setNotificaciones(data.data)
          }
          setTotal(data.total)
          setOffset(newOffset)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [tab]
  )

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones/count")
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    setOffset(0)
    fetchNotificaciones(0, false)
    fetchUnreadCount()
  }, [tab, fetchNotificaciones, fetchUnreadCount])

  const markAllRead = async () => {
    try {
      await fetch("/api/notificaciones/leer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: "all" }),
      })
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
      setUnreadCount(0)
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
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // silently fail
      }
    }
    router.push(getNotifUrl(n))
  }

  const loadMore = () => {
    fetchNotificaciones(offset + LIMIT, true)
  }

  const hasMore = notificaciones.length < total
  const grouped = groupByDate(notificaciones)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-stone-800">Notificaciones</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Marcar todas como leidas
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-stone-200">
        <button
          onClick={() => setTab("todas")}
          className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
            tab === "todas"
              ? "border-stone-800 text-stone-800 font-medium"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setTab("no_leidas")}
          className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
            tab === "no_leidas"
              ? "border-stone-800 text-stone-800 font-medium"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
        >
          No leidas{unreadCount > 0 && ` (${unreadCount})`}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
        </div>
      ) : notificaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-stone-400">
          <Bell className="h-8 w-8 mb-3 stroke-1" />
          <p className="text-sm">
            {tab === "no_leidas" ? "No hay notificaciones sin leer" : "No hay notificaciones"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h3>
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
                {group.items.map((n) => {
                  const config = getIconConfig(n.plantilla_id || n.tipo)
                  const Icon = config.icon
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors ${
                        !n.leida ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {!n.leida && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          )}
                          <span
                            className={`text-sm ${
                              !n.leida ? "font-medium text-stone-800" : "text-stone-600"
                            }`}
                          >
                            {n.titulo}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{n.mensaje}</p>
                      </div>
                      <span className="text-[10px] text-stone-300 shrink-0 mt-1">
                        {formatearTiempoRelativo(n.created_at)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs text-stone-500"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
                    Cargando...
                  </span>
                ) : (
                  "Cargar mas"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
