"use client"

import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { DollarSign, AlertTriangle, Clock } from "lucide-react"
import { TipoBadge } from "@/components/shared/status-badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function KanbanCard({ pedido, onClick }: { pedido: any; onClick: () => void }) {
  const saldo = Number(pedido.saldo_pendiente || 0)
  const montoPagado = Number(pedido.monto_pagado || 0)
  const monto = Number(pedido.monto_total || 0)
  const completadas = pedido.tareas_completadas || 0
  const total = pedido.tareas_total || 0
  const progreso = total > 0 ? (completadas / total) * 100 : 0

  const estado = pedido.estado_interno
  const prioridad = pedido.prioridad

  // Date status
  let fechaColor = "text-stone-400"
  let fechaVencida = false
  if (pedido.fecha_comprometida) {
    const fc = new Date(pedido.fecha_comprometida)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    if (fc < hoy) { fechaColor = "text-red-600 font-medium"; fechaVencida = true }
    else if (fc.toDateString() === hoy.toDateString()) { fechaColor = "text-amber-600 font-medium" }
  }

  // Days in state
  const diasIngreso = pedido.fecha_ingreso
    ? Math.floor((Date.now() - new Date(pedido.fecha_ingreso).getTime()) / 86400000)
    : 0

  const sinClasificar = !pedido.tipo || pedido.tipo === "sin_clasificar"

  // Border left for priority/blocked
  let borderLeft = ""
  if (sinClasificar) borderLeft = "border border-dashed border-amber-300"
  else if (["esperando_insumos", "esperando_diseno"].includes(estado)) borderLeft = "border-l-[3px] border-l-red-400 bg-red-50/30"
  else if (prioridad === "urgente") borderLeft = "border-l-[3px] border-l-red-500"
  else if (prioridad === "alta") borderLeft = "border-l-[3px] border-l-amber-500"

  // Alerts
  const alertas: { icon: typeof DollarSign; color: string }[] = []
  if (saldo > 0 && montoPagado === 0) alertas.push({ icon: DollarSign, color: "text-amber-500" })
  if (fechaVencida) alertas.push({ icon: AlertTriangle, color: "text-red-500" })

  const initials = pedido.cliente?.nombre?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-stone-200 rounded-[10px] px-3.5 py-3 mb-2 cursor-pointer
        hover:border-stone-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all ${borderLeft}`}
    >
      {/* Row 1: ID + Type + Priority dot */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-stone-400">#{pedido.numero_tn || pedido.id.slice(0, 6)}</span>
          <TipoBadge tipo={pedido.tipo || "sin_clasificar"} />
        </div>
        <span className={`h-2 w-2 rounded-full ${
          prioridad === "urgente" ? "bg-red-500" : prioridad === "alta" ? "bg-amber-500" : "bg-stone-300"
        }`} />
      </div>

      {/* Row 2: Client */}
      <p className="text-sm font-medium text-stone-800 truncate">{pedido.cliente?.nombre || "—"}</p>

      {/* Row 3: Monto + Fecha */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-sm font-medium font-mono text-stone-700">
          ${monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
        </span>
        {pedido.fecha_comprometida ? (
          <span className={`text-xs ${fechaColor} flex items-center gap-0.5`}>
            {fechaVencida && <Clock className="h-3 w-3" strokeWidth={1.5} />}
            {format(new Date(pedido.fecha_comprometida), "dd/MM", { locale: es })}
          </span>
        ) : (
          <span className="text-xs text-stone-300">—</span>
        )}
      </div>

      {/* Row 4: Progress */}
      {total > 0 && (
        <div className="mt-2">
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progreso >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="text-xs text-stone-400 mt-0.5 block">{completadas}/{total} tareas</span>
        </div>
      )}

      {/* Row 5: Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {alertas.map((a, i) => (
            <a.icon key={i} className={`h-3.5 w-3.5 ${a.color}`} strokeWidth={1.5} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] ${diasIngreso > 6 ? "text-red-600" : diasIngreso > 3 ? "text-amber-600" : "text-stone-400"}`}>
            {diasIngreso > 0 ? `${diasIngreso}d` : "hoy"}
          </span>
          <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-[10px] font-medium flex items-center justify-center">
            {initials}
          </div>
        </div>
      </div>
    </div>
  )
}
