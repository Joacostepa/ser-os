"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { DataTable } from "@/components/shared/data-table"
import { getCampanaDetalle, aprobarCampana } from "@/lib/actions/marketing"
import { formatearMontoCompleto } from "@/lib/formatters"
import { ArrowLeft, Check, X } from "lucide-react"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"

const ESTADO_CAMPANA_BADGE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  lista: "bg-blue-100 text-blue-700",
  aprobada: "bg-green-100 text-green-700",
  ejecutada: "bg-violet-100 text-violet-700",
  completada: "bg-teal-100 text-teal-700",
}

const ESTADO_CAMPANA_LABEL: Record<string, string> = {
  borrador: "Borrador",
  lista: "Lista",
  aprobada: "Aprobada",
  ejecutada: "Ejecutada",
  completada: "Completada",
}

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
    header: "Estado",
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
    accessorKey: "codigo",
    header: "Codigo",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-stone-600">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "descuento",
    header: "Descuento",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-700">{row.original.descuento}%</span>
    ),
  },
  {
    accessorKey: "usado",
    header: "Usado",
    cell: ({ row }) => (
      row.original.usado ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-stone-300" />
      )
    ),
  },
  {
    accessorKey: "pedido_id",
    header: "Pedido",
    cell: ({ row }) => (
      row.original.usado && row.original.pedido_id ? (
        <Link
          href={`/pedidos/${row.original.pedido_id}`}
          className="text-xs text-blue-600 hover:underline font-mono"
        >
          {row.original.pedido_id.slice(0, 8)}
        </Link>
      ) : (
        <span className="text-xs text-stone-300">---</span>
      )
    ),
  },
]

export default function CampanaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campana, setCampana] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aprobando, setAprobando] = useState(false)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const result = await getCampanaDetalle(id)
        setCampana(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  async function handleAprobar() {
    setAprobando(true)
    try {
      await aprobarCampana(id)
      toast.success("Campana aprobada")
      // Reload
      const result = await getCampanaDetalle(id)
      setCampana(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aprobar la campana")
    } finally {
      setAprobando(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!campana) {
    return (
      <div className="space-y-4">
        <Link href="/marketing/campanas" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Campanas
        </Link>
        <p className="text-sm text-stone-400">Campana no encontrada.</p>
      </div>
    )
  }

  const canAprobar = campana.estado === "lista" || campana.estado === "borrador"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/marketing/campanas" className="text-stone-400 hover:text-stone-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-stone-900">{campana.nombre}</h1>
              <Badge variant="secondary" className={ESTADO_CAMPANA_BADGE[campana.estado] ?? ""}>
                {ESTADO_CAMPANA_LABEL[campana.estado] ?? campana.estado}
              </Badge>
            </div>
            <p className="text-sm text-stone-400">
              {campana.mes}/{campana.anio}
            </p>
          </div>
        </div>
        {canAprobar && (
          <Button onClick={handleAprobar} disabled={aprobando}>
            <Check className="h-4 w-4 mr-1" />
            {aprobando ? "Aprobando..." : "Aprobar"}
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title="Resumen de cupones" description="Distribucion por estado de clienta">
          <div className="space-y-2">
            {Object.entries(campana.countByEstado ?? {}).map(([estado, count]) => (
              <div key={estado} className="flex items-center justify-between py-1">
                <Badge variant="secondary" className={ESTADO_CLIENTA_BADGE[estado] ?? ""}>
                  {ESTADO_CLIENTA_LABEL[estado] ?? estado}
                </Badge>
                <span className="font-mono text-sm text-stone-700">{count as number}</span>
              </div>
            ))}
            <div className="border-t border-stone-200 pt-2 mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">VIP</span>
                <span className="font-mono text-sm text-amber-700">{campana.vipCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">Estandar</span>
                <span className="font-mono text-sm text-stone-600">{campana.estCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Total cupones</span>
                <span className="font-mono text-sm font-medium text-stone-800">{campana.totalCupones}</span>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Envio de emails" description="Log de comunicaciones">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-stone-600">Enviados</span>
              <span className="font-mono text-sm text-green-700">{campana.emailLogs?.enviados ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-stone-600">Errores</span>
              <span className="font-mono text-sm text-red-500">{campana.emailLogs?.errores ?? 0}</span>
            </div>
            <div className="border-t border-stone-200 pt-2 mt-2">
              <p className="text-xs text-stone-400 mb-2">Por tipo de envio</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Dia 1 (inicio mes)</span>
                  <span className="font-mono text-xs text-stone-600">{campana.emailLogs?.byTipo?.dia1 ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Dia 10 (recordatorio)</span>
                  <span className="font-mono text-xs text-stone-600">{campana.emailLogs?.byTipo?.dia10 ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Dia 27 (urgencia)</span>
                  <span className="font-mono text-xs text-stone-600">{campana.emailLogs?.byTipo?.dia27 ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Cupones table */}
      <DashboardCard title="Cupones" description={`${campana.totalCupones} cupones generados`}>
        <DataTable
          columns={cuponesColumns as ColumnDef<{ id: string }>[]}
          data={campana.cupones ?? []}
        />
      </DashboardCard>
    </div>
  )
}
