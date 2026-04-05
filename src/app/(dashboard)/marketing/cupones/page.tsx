"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/data-table"
import { getCuponesHistorial, getCampanas } from "@/lib/actions/marketing"
import { formatearMontoCompleto } from "@/lib/formatters"
import { Search } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const ESTADO_CLIENTA_BADGE: Record<string, string> = {
  activa: "bg-green-100 text-green-700",
  inactiva: "bg-amber-100 text-amber-700",
  dormida: "bg-stone-200 text-stone-600",
  reactivacion: "bg-blue-100 text-blue-700",
  nunca_compro: "bg-gray-100 text-gray-500",
}

const ESTADO_CLIENTA_LABEL: Record<string, string> = {
  activa: "Activa",
  inactiva: "Inactiva",
  dormida: "Dormida",
  reactivacion: "Reactivacion",
  nunca_compro: "Nunca compro",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cuponesColumns: ColumnDef<any>[] = [
  {
    accessorKey: "codigo",
    header: "Codigo",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-stone-600">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "cliente_nombre",
    header: "Cliente",
    cell: ({ row }) => (
      row.original.cliente_id ? (
        <Link
          href={`/clientes/${row.original.cliente_id}`}
          className="text-sm font-medium text-stone-800 hover:underline"
        >
          {row.original.cliente_nombre}
        </Link>
      ) : (
        <span className="text-sm text-stone-800">{row.original.cliente_nombre}</span>
      )
    ),
  },
  {
    accessorKey: "estado_clienta",
    header: "Estado clienta",
    cell: ({ row }) => (
      <Badge variant="secondary" className={ESTADO_CLIENTA_BADGE[row.original.estado_clienta] ?? ""}>
        {ESTADO_CLIENTA_LABEL[row.original.estado_clienta] ?? row.original.estado_clienta}
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
    accessorKey: "descuento",
    header: "Valor",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-700">{row.original.descuento}%</span>
    ),
  },
  {
    accessorKey: "usado",
    header: "Usado",
    cell: ({ row }) => (
      row.original.usado ? (
        <Badge variant="secondary" className="bg-green-100 text-green-700">Usado</Badge>
      ) : (
        <Badge variant="secondary" className="bg-stone-100 text-stone-500">Pendiente</Badge>
      )
    ),
  },
  {
    accessorKey: "fecha_uso",
    header: "Fecha uso",
    cell: ({ row }) => (
      row.original.fecha_uso ? (
        <span className="text-xs text-stone-500">
          {format(new Date(row.original.fecha_uso), "dd/MM/yyyy", { locale: es })}
        </span>
      ) : (
        <span className="text-xs text-stone-300">---</span>
      )
    ),
  },
  {
    accessorKey: "monto_compra",
    header: "Monto compra",
    cell: ({ row }) => (
      row.original.monto_compra ? (
        <span className="font-mono text-sm text-stone-700">
          {formatearMontoCompleto(row.original.monto_compra)}
        </span>
      ) : (
        <span className="text-xs text-stone-300">---</span>
      )
    ),
  },
]

export default function CuponesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cupones, setCupones] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campanas, setCampanas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroCampana, setFiltroCampana] = useState("")

  useEffect(() => {
    async function fetchCampanas() {
      try {
        const result = await getCampanas()
        setCampanas(result)
      } catch {
        // silently fail
      }
    }
    fetchCampanas()
  }, [])

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const filtros: { busqueda?: string; estado?: string; campana_id?: string } = {}
        if (busqueda) filtros.busqueda = busqueda
        if (filtroEstado && filtroEstado !== "todos") filtros.estado = filtroEstado
        if (filtroCampana && filtroCampana !== "todas") filtros.campana_id = filtroCampana
        const result = await getCuponesHistorial(filtros)
        setCupones(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [busqueda, filtroEstado, filtroCampana])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Cupones</h1>
        <p className="text-sm text-stone-400">Historial de todos los cupones generados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar por codigo o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filtroEstado} onValueChange={(v: string | null) => v && setFiltroEstado(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="usado">Usado</SelectItem>
            <SelectItem value="no_usado">No usado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCampana} onValueChange={(v: string | null) => v && setFiltroCampana(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Campana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {campanas.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre ?? `${c.mes}/${c.anio}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={cuponesColumns as ColumnDef<{ id: string }>[]}
          data={cupones}
        />
      )}
    </div>
  )
}
