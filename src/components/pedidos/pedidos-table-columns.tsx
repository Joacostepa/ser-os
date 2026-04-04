"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { EstadoBadge, PrioridadBadge, TipoBadge } from "@/components/shared/status-badge"
import { CanalBadge } from "@/components/shared/canal-badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pedidosColumns: ColumnDef<any>[] = [
  {
    accessorKey: "numero_tn",
    header: "# Pedido",
    cell: ({ row }) => (
      <span className="text-stone-400 text-sm font-mono">
        {row.original.numero_tn || `#${row.original.id.slice(0, 8)}`}
      </span>
    ),
  },
  {
    accessorKey: "fecha_ingreso",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-stone-400 text-sm">
        {format(new Date(row.original.fecha_ingreso), "dd/MM/yyyy", { locale: es })}
      </span>
    ),
  },
  {
    accessorKey: "canal",
    header: "Canal",
    cell: ({ row }) => (
      <CanalBadge canal={row.original.tienda?.canal || null} />
    ),
  },
  {
    accessorKey: "cliente",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-stone-800 font-medium text-sm">{row.original.cliente?.nombre || "—"}</span>
    ),
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => <TipoBadge tipo={row.original.tipo} />,
  },
  {
    accessorKey: "estado_interno",
    header: "Estado",
    cell: ({ row }) => <EstadoBadge estado={row.original.estado_interno} />,
  },
  {
    accessorKey: "prioridad",
    header: "Prioridad",
    cell: ({ row }) => <PrioridadBadge prioridad={row.original.prioridad} />,
  },
  {
    accessorKey: "fecha_comprometida",
    header: "Entrega",
    cell: ({ row }) =>
      row.original.fecha_comprometida ? (
        <span className="text-stone-500 text-sm">
          {format(new Date(row.original.fecha_comprometida), "dd MMM", { locale: es })}
        </span>
      ) : (
        <span className="text-stone-300">—</span>
      ),
  },
  {
    accessorKey: "monto_total",
    header: "Monto",
    cell: ({ row }) => (
      <span className="text-stone-800 font-medium text-sm font-mono text-right block">
        ${Number(row.original.monto_total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: "monto_total_usd",
    header: "USD",
    cell: ({ row }) => {
      const usd = row.original.monto_total_usd
      if (!usd) return <span className="text-stone-300">—</span>
      return (
        <span className="text-green-700 text-sm font-mono text-right block">
          US${Number(usd).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
        </span>
      )
    },
  },
  {
    accessorKey: "saldo_pendiente",
    header: "Saldo",
    cell: ({ row }) => {
      const saldo = Number(row.original.saldo_pendiente)
      return (
        <span className={`text-sm font-mono text-right block ${
          saldo > 0 ? "text-red-500 font-medium" : "text-green-600"
        }`}>
          ${saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
        </span>
      )
    },
  },
]
