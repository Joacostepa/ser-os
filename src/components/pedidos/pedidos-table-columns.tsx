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
      <span className="font-medium">
        {row.original.numero_tn || `#${row.original.id.slice(0, 8)}`}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {format(new Date(row.original.created_at), "dd/MM/yyyy", { locale: es })}
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
      <span>{row.original.cliente?.nombre || "—"}</span>
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
      row.original.fecha_comprometida
        ? format(new Date(row.original.fecha_comprometida), "dd MMM yyyy", { locale: es })
        : "—",
  },
  {
    accessorKey: "monto_total",
    header: "Monto",
    cell: ({ row }) => (
      <span className="tabular-nums">
        ${Number(row.original.monto_total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: "saldo_pendiente",
    header: "Saldo",
    cell: ({ row }) => {
      const saldo = Number(row.original.saldo_pendiente)
      return (
        <span className={`tabular-nums ${saldo > 0 ? "text-red-600 font-medium" : "text-green-600"}`}>
          ${saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
        </span>
      )
    },
  },
]
