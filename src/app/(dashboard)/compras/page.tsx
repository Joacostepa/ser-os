"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { MetricCard } from "@/components/reportes/kpi-card"
import { Plus, Search } from "lucide-react"
import {
  ESTADO_COMPRA_CONFIG,
  ESTADO_PAGO_COMPRA_CONFIG,
} from "@/lib/constants"
import { formatearMonto, formatearMontoCompleto } from "@/lib/formatters"
import { type ColumnDef } from "@tanstack/react-table"
import type { EstadoCompra } from "@/types/database"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const comprasColumns: ColumnDef<any>[] = [
  {
    accessorKey: "numero_orden",
    header: "OC#",
    cell: ({ row }) => (
      <span className="font-mono text-stone-400 text-xs">
        {row.original.numero_orden || row.original.id.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: "fecha_pedido",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-stone-400 text-xs">
        {format(new Date(row.original.fecha_pedido || row.original.created_at), "dd/MM/yyyy", { locale: es })}
      </span>
    ),
  },
  {
    accessorKey: "proveedor",
    header: "Proveedor",
    cell: ({ row }) => (
      <span className="font-medium text-stone-800">
        {row.original.proveedor?.nombre ?? "---"}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const config = ESTADO_COMPRA_CONFIG[row.original.estado as EstadoCompra]
      return (
        <Badge variant="secondary" className={config?.color}>
          {config?.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => (
      <span className="text-stone-500 text-xs">
        {row.original.items?.[0]?.count ?? 0}
      </span>
    ),
  },
  {
    id: "recepcion",
    header: "Recepcion",
    cell: ({ row }) => {
      const estado = row.original.estado as EstadoCompra
      if (estado === "recibida") {
        return (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full bg-green-500" />
            <span className="text-xs text-green-600">100%</span>
          </div>
        )
      }
      if (estado === "recibida_parcial") {
        return (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full bg-stone-200">
              <div className="h-1.5 rounded-full bg-amber-500" style={{ width: "50%" }} />
            </div>
            <span className="text-xs text-amber-600">Parcial</span>
          </div>
        )
      }
      if (estado === "cancelada") {
        return <span className="text-xs text-stone-300">---</span>
      }
      return (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 rounded-full bg-stone-200" />
          <span className="text-xs text-stone-400">0%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "subtotal",
    header: "Total",
    cell: ({ row }) => {
      const total =
        Number(row.original.subtotal || 0) -
        Number(row.original.descuento || 0)
      return (
        <span className="font-mono font-medium text-stone-800">
          {formatearMontoCompleto(total)}
        </span>
      )
    },
  },
  {
    accessorKey: "estado_pago",
    header: "Pago",
    cell: ({ row }) => {
      const key = row.original.estado_pago as keyof typeof ESTADO_PAGO_COMPRA_CONFIG
      const config = ESTADO_PAGO_COMPRA_CONFIG[key]
      if (!config) return <span className="text-xs text-stone-400">---</span>
      return <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
    },
  },
  {
    id: "saldo",
    header: "Saldo",
    cell: ({ row }) => {
      const total =
        Number(row.original.subtotal || 0) -
        Number(row.original.descuento || 0)
      // Saldo is just visual here; exact saldo needs pagos data. Show total if not pagada.
      const pagada = row.original.estado_pago === "pagada"
      return (
        <span
          className={`font-mono text-xs ${
            pagada ? "text-green-600" : "text-red-500"
          }`}
        >
          {pagada ? formatearMontoCompleto(0) : formatearMontoCompleto(total)}
        </span>
      )
    },
  },
]

export default function ComprasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compras, setCompras] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroProveedor, setFiltroProveedor] = useState("")
  const [filtroPago, setFiltroPago] = useState("")
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Metrics
  const [metrics, setMetrics] = useState({
    totalCompras: 0,
    montoComprado: 0,
    pendienteRecibirCount: 0,
    pendienteRecibirMonto: 0,
    pendientePagar: 0,
  })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      let query = supabase
        .from("compras")
        .select(`
          *,
          proveedor:proveedores(id, nombre),
          pedido:pedidos(id, numero_tn),
          items:items_compra(count)
        `)
        .order("created_at", { ascending: false })

      if (filtroEstado && filtroEstado !== "todos") {
        query = query.eq("estado", filtroEstado)
      }
      if (filtroProveedor && filtroProveedor !== "todos") {
        query = query.eq("proveedor_id", filtroProveedor)
      }
      if (filtroPago && filtroPago !== "todos") {
        query = query.eq("estado_pago", filtroPago)
      }

      const { data } = await query
      const lista = data ?? []
      setCompras(lista)

      // Calculate metrics from ALL compras (not filtered)
      const { data: allCompras } = await supabase
        .from("compras")
        .select("id, estado, estado_pago, subtotal, descuento")

      const all = allCompras ?? []
      const totalCompras = all.length
      const montoComprado = all.reduce(
        (s, c) => s + (Number(c.subtotal) - Number(c.descuento ?? 0)),
        0
      )
      const pendientes = all.filter(
        (c) => !["recibida", "cancelada"].includes(c.estado)
      )
      const pendienteRecibirCount = pendientes.length
      const pendienteRecibirMonto = pendientes.reduce(
        (s, c) => s + (Number(c.subtotal) - Number(c.descuento ?? 0)),
        0
      )
      const pendientePagar = all
        .filter((c) => c.estado_pago !== "pagada" && c.estado !== "cancelada")
        .reduce((s, c) => s + (Number(c.subtotal) - Number(c.descuento ?? 0)), 0)

      setMetrics({
        totalCompras,
        montoComprado,
        pendienteRecibirCount,
        pendienteRecibirMonto,
        pendientePagar,
      })

      setLoading(false)
    }
    fetchData()
  }, [filtroEstado, filtroProveedor, filtroPago, supabase])

  useEffect(() => {
    async function fetchProveedores() {
      const { data } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre")
      setProveedores(data || [])
    }
    fetchProveedores()
  }, [supabase])

  const comprasFiltradas = busqueda
    ? compras.filter(
        (c) =>
          c.numero_orden?.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.proveedor?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.notas?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : compras

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Compras</h1>
          <p className="text-sm text-stone-400">Ordenes de compra a proveedores</p>
        </div>
        <Link href="/compras/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Nueva orden de compra
          </Button>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Total compras"
          value={String(metrics.totalCompras)}
          subtitle="ordenes"
        />
        <MetricCard
          label="Monto comprado"
          value={formatearMonto(metrics.montoComprado)}
          subtitle="acumulado"
        />
        <MetricCard
          label="Pendiente recibir"
          value={String(metrics.pendienteRecibirCount)}
          subtitle={formatearMonto(metrics.pendienteRecibirMonto)}
        />
        <MetricCard
          label="Pendiente pagar"
          value={formatearMonto(metrics.pendientePagar)}
          valueColor="text-red-600"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar por OC, proveedor..."
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
            {Object.entries(ESTADO_COMPRA_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroProveedor} onValueChange={(v: string | null) => v && setFiltroProveedor(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {proveedores.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroPago} onValueChange={(v: string | null) => v && setFiltroPago(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(ESTADO_PAGO_COMPRA_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
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
          columns={comprasColumns as ColumnDef<{ id: string }>[]}
          data={comprasFiltradas}
          onRowClick={(row: { id: string }) => router.push(`/compras/${row.id}`)}
        />
      )}
    </div>
  )
}
