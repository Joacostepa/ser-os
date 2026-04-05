"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/data-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getClientasClub } from "@/lib/actions/marketing"
import { formatearMontoCompleto } from "@/lib/formatters"
import { type ColumnDef } from "@tanstack/react-table"

const ESTADO_BADGE: Record<string, string> = {
  activa: "bg-green-100 text-green-700",
  inactiva: "bg-amber-100 text-amber-700",
  dormida: "bg-stone-200 text-stone-600",
  reactivacion: "bg-blue-100 text-blue-700",
  nunca_compro: "bg-gray-100 text-gray-500",
}

const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa",
  inactiva: "Inactiva",
  dormida: "Dormida",
  reactivacion: "Reactivacion",
  nunca_compro: "Nunca compro",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<any>[] = [
  {
    accessorKey: "nombre",
    header: "Cliente",
    cell: ({ row }) => (
      <Link
        href={`/clientes/${row.original.cliente_id}`}
        className="text-sm font-medium text-stone-800 hover:underline"
      >
        {row.original.nombre}
      </Link>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant="secondary" className={ESTADO_BADGE[row.original.estado] ?? ""}>
        {ESTADO_LABEL[row.original.estado] ?? row.original.estado}
      </Badge>
    ),
  },
  {
    accessorKey: "nivel",
    header: "Nivel",
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={row.original.nivel === "VIP" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}
      >
        {row.original.nivel === "VIP" ? "VIP" : "EST"}
      </Badge>
    ),
  },
  {
    accessorKey: "racha",
    header: "Racha",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-700">
        {row.original.racha}m {row.original.racha > 6 ? "\uD83D\uDD25" : ""}
      </span>
    ),
  },
  {
    accessorKey: "promedio",
    header: "Promedio",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-700">
        {formatearMontoCompleto(row.original.promedio)}
      </span>
    ),
  },
  {
    accessorKey: "descuento",
    header: "Descuento",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-700">
        {row.original.descuento}%
      </span>
    ),
  },
]

export default function ClubSerPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientas, setClientas] = useState<any[]>([])
  const [counts, setCounts] = useState({ activas: 0, inactivas: 0, vip: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("todas")

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const filtro = tab === "todas" ? undefined : tab === "vip" ? undefined : tab
        const result = await getClientasClub(
          tab === "vip"
            ? undefined
            : filtro
              ? { estado: filtro === "activas" ? "activa" : filtro === "inactivas" ? "inactiva" : filtro }
              : undefined
        )

        let lista = result.clientas
        // Client-side filter for VIP since it's a nivel, not estado
        if (tab === "vip") {
          lista = lista.filter((c: { nivel: string }) => c.nivel === "VIP")
        }

        setClientas(lista)
        setCounts(result.counts)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [tab])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Club SER</h1>
        <p className="text-sm text-stone-400">Clientas del programa de fidelidad</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList variant="line">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="activas">
            Activas <span className="ml-1 font-mono text-xs text-stone-400">({counts.activas})</span>
          </TabsTrigger>
          <TabsTrigger value="inactivas">
            Inactivas <span className="ml-1 font-mono text-xs text-stone-400">({counts.inactivas})</span>
          </TabsTrigger>
          <TabsTrigger value="vip">
            VIP <span className="ml-1 font-mono text-xs text-stone-400">({counts.vip})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="space-y-2 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <DataTable
                columns={columns as ColumnDef<{ id: string }>[]}
                data={clientas}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
