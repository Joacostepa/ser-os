"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { EstadoBadge, PrioridadBadge } from "@/components/shared/status-badge"
import { ChevronRight } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ListView({ pedidos, onPedidoClick }: { pedidos: any[]; onPedidoClick: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/50">
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-4 text-left">#</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-left">Fecha</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-left">Cliente</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-left">Estado</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-left">Prioridad</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-left">Tareas</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-left">Entrega</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-right">Monto</th>
            <th className="text-xs text-stone-400 font-medium uppercase tracking-wide py-3 px-3 text-right">Saldo</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p, idx) => {
            const saldo = Number(p.saldo_pendiente || 0)
            const completadas = p.tareas_completadas || 0
            const total = p.tareas_total || 0
            const progreso = total > 0 ? (completadas / total) * 100 : 0

            return (
              <tr
                key={p.id}
                onClick={() => onPedidoClick(p.id)}
                className={`border-b border-stone-100 cursor-pointer hover:bg-stone-100/60 transition-colors ${
                  idx % 2 === 1 ? "bg-stone-50/50" : ""
                }`}
              >
                <td className="py-3 px-4 text-sm font-mono text-stone-400">
                  {p.numero_tn || p.id.slice(0, 6)}
                </td>
                <td className="py-3 px-3 text-sm text-stone-400">
                  {format(new Date(p.fecha_ingreso || p.created_at), "dd/MM", { locale: es })}
                </td>
                <td className="py-3 px-3 text-sm font-medium text-stone-800 truncate max-w-[200px]">
                  {p.cliente?.nombre || "—"}
                </td>
                <td className="py-3 px-3">
                  <EstadoBadge estado={p.estado_interno} />
                </td>
                <td className="py-3 px-3">
                  <PrioridadBadge prioridad={p.prioridad} />
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-stone-500">{completadas}/{total}</span>
                    {total > 0 && (
                      <div className="w-12 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progreso >= 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${progreso}%` }} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-sm text-stone-500">
                  {p.fecha_comprometida
                    ? format(new Date(p.fecha_comprometida), "dd/MM", { locale: es })
                    : "—"}
                </td>
                <td className="py-3 px-3 text-sm font-medium font-mono text-stone-800 text-right">
                  ${Number(p.monto_total).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </td>
                <td className={`py-3 px-3 text-sm font-mono text-right ${saldo > 0 ? "text-red-500 font-medium" : "text-green-600"}`}>
                  ${saldo.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-2">
                  <ChevronRight className="h-4 w-4 text-stone-300" strokeWidth={1.5} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {pedidos.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-12">Sin pedidos activos</p>
      )}
    </div>
  )
}
