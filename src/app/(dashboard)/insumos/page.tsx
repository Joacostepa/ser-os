"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/data-table"
import { CeldaEditable } from "@/components/shared/celda-editable"
import { MetricCard } from "@/components/reportes/kpi-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Check, CircleAlert } from "lucide-react"
import { crearInsumo } from "@/lib/actions/insumos"
import { TIPO_INSUMO_CONFIG, UNIDAD_INSUMO_CONFIG } from "@/lib/constants"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"
import type { TipoInsumo, UnidadInsumo } from "@/types/database"

// ---------------------------------------------------------------------------
// Inline update helpers (client-side)
// ---------------------------------------------------------------------------

async function actualizarCostoInline(
  insumoId: string,
  nuevoCosto: number,
  costoAnterior: number
) {
  const supabase = createClient()
  const { error } = await supabase
    .from("insumos")
    .update({ costo_unitario: nuevoCosto })
    .eq("id", insumoId)
  if (error) throw error

  // Record cost history
  const { error: histErr } = await supabase
    .from("historial_costos_insumo")
    .insert({
      insumo_id: insumoId,
      costo_anterior: costoAnterior,
      costo_nuevo: nuevoCosto,
      motivo: "Edicion inline desde listado",
    })
  if (histErr) throw histErr
}

async function actualizarMinimoInline(insumoId: string, nuevoMinimo: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from("insumos")
    .update({ stock_minimo: nuevoMinimo })
    .eq("id", insumoId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InsumosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [insumos, setInsumos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState<TipoInsumo>("material")
  const [unidad, setUnidad] = useState<UnidadInsumo>("unidades")
  const [stockMinimo, setStockMinimo] = useState(0)
  const [costoUnitario, setCostoUnitario] = useState(0)
  const [unidadCompra, setUnidadCompra] = useState("")
  const [rendimiento, setRendimiento] = useState(1)
  const [proveedorId, setProveedorId] = useState("")
  const [notas, setNotas] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchInsumos = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("insumos")
      .select("*, proveedor:proveedores(id, nombre)")
      .eq("activo", true)
      .order("nombre")

    if (filtroTipo && filtroTipo !== "todos") {
      query = query.eq("tipo", filtroTipo)
    }
    if (busqueda) {
      query = query.or(`nombre.ilike.%${busqueda}%`)
    }

    const { data } = await query
    setInsumos(data || [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroTipo])

  useEffect(() => {
    fetchInsumos()
  }, [fetchInsumos])

  useEffect(() => {
    supabase
      .from("proveedores")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setProveedores(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setSubmitting(true)
    try {
      await crearInsumo({
        nombre: nombre.trim(),
        tipo,
        unidad,
        stock_minimo: stockMinimo,
        costo_unitario: costoUnitario,
        unidad_compra: unidadCompra || undefined,
        rendimiento: rendimiento || 1,
        proveedor_id: proveedorId || undefined,
        notas: notas || undefined,
      })
      toast.success("Insumo creado")
      setDialogOpen(false)
      setNombre("")
      setStockMinimo(0)
      setCostoUnitario(0)
      setUnidadCompra("")
      setRendimiento(1)
      setProveedorId("")
      setNotas("")
      fetchInsumos()
    } catch {
      toast.error("Error al crear el insumo")
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Computed metrics
  // ---------------------------------------------------------------------------

  const materiales = insumos.filter((i) => i.tipo === "material")
  const servicios = insumos.filter((i) => i.tipo === "servicio")
  const sinCosto = insumos.filter((i) => Number(i.costo_unitario) === 0)
  const bajoStock = materiales.filter(
    (i) =>
      Number(i.stock_actual) < Number(i.stock_minimo) &&
      Number(i.stock_minimo) > 0
  )
  const valorTotal = materiales.reduce(
    (sum, i) => sum + Number(i.stock_actual) * Number(i.costo_unitario),
    0
  )

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insumosColumns: ColumnDef<any>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <Link
          href={`/insumos/${row.original.id}`}
          className="font-medium text-stone-900 hover:text-blue-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.nombre}
        </Link>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const config = TIPO_INSUMO_CONFIG[row.original.tipo as TipoInsumo]
        return (
          <Badge variant="secondary" className={config?.color}>
            {config?.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "stock_actual",
      header: "Stock",
      cell: ({ row }) => {
        if (row.original.tipo === "servicio")
          return <span className="text-stone-400">N/A</span>
        const unidadConf =
          UNIDAD_INSUMO_CONFIG[row.original.unidad as UnidadInsumo]
        return (
          <span className="font-mono tabular-nums">
            {Number(row.original.stock_actual).toLocaleString("es-AR")}{" "}
            {unidadConf?.short}
          </span>
        )
      },
    },
    {
      accessorKey: "stock_minimo",
      header: "Minimo",
      cell: ({ row }) => {
        if (row.original.tipo === "servicio")
          return <span className="text-stone-400">N/A</span>
        const val = Number(row.original.stock_minimo)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <CeldaEditable
              valor={val}
              onGuardar={async (nuevo) => {
                try {
                  await actualizarMinimoInline(row.original.id, nuevo)
                  toast.success("Minimo actualizado")
                  fetchInsumos()
                } catch {
                  toast.error("Error al actualizar")
                }
              }}
              className={val === 0 ? "text-red-400" : ""}
            />
          </div>
        )
      },
    },
    {
      accessorKey: "costo_unitario",
      header: "Costo unit.",
      cell: ({ row }) => {
        const val = Number(row.original.costo_unitario)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <CeldaEditable
              valor={val}
              prefijo="$"
              sufijo="/u"
              onGuardar={async (nuevo) => {
                try {
                  await actualizarCostoInline(row.original.id, nuevo, val)
                  toast.success("Costo actualizado")
                  fetchInsumos()
                } catch {
                  toast.error("Error al actualizar")
                }
              }}
              className={val === 0 ? "text-red-400" : ""}
            />
          </div>
        )
      },
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const i = row.original
        const costo = Number(i.costo_unitario)
        const minimo = Number(i.stock_minimo)
        const stock = Number(i.stock_actual)
        const esMaterial = i.tipo === "material"

        const sinCostoFlag = costo === 0
        const sinMinimoFlag = esMaterial && minimo === 0
        const bajoPuntoFlag = esMaterial && minimo > 0 && stock < minimo

        if (!sinCostoFlag && !sinMinimoFlag && !bajoPuntoFlag) {
          return (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs">OK</span>
            </span>
          )
        }

        return (
          <div className="flex items-center gap-1.5">
            {sinCostoFlag && (
              <span
                className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0"
                title="Sin costo"
              />
            )}
            {sinMinimoFlag && (
              <span
                className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"
                title="Sin minimo"
              />
            )}
            {bajoPuntoFlag && (
              <CircleAlert
                className="h-3.5 w-3.5 text-red-500 shrink-0"
                aria-label="Stock bajo minimo"
              />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insumos</h1>
          <p className="text-sm text-muted-foreground">
            Materiales y servicios para produccion
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo insumo
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo insumo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrear} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={tipo}
                    onValueChange={(v: string | null) =>
                      v && setTipo(v as TipoInsumo)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_INSUMO_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad de uso</Label>
                  <Select
                    value={unidad}
                    onValueChange={(v: string | null) =>
                      v && setUnidad(v as UnidadInsumo)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIDAD_INSUMO_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label} ({v.short})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock minimo</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={stockMinimo}
                    onChange={(e) =>
                      setStockMinimo(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo unitario ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={costoUnitario}
                    onChange={(e) =>
                      setCostoUnitario(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unidad de compra</Label>
                  <Input
                    placeholder="Ej: Bidon 5L, Rollo, Plancha"
                    value={unidadCompra}
                    onChange={(e) => setUnidadCompra(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rendimiento (x)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    value={rendimiento}
                    onChange={(e) =>
                      setRendimiento(parseFloat(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Proveedor habitual</Label>
                <Select
                  value={proveedorId}
                  onValueChange={(v: string | null) => v && setProveedorId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {proveedores.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creando..." : "Crear insumo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metric cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Insumos totales"
            value={String(insumos.length)}
            subtitle={`${materiales.length} materiales · ${servicios.length} servicios`}
          />
          <MetricCard
            label="Sin costo"
            value={String(sinCosto.length)}
            valueColor={sinCosto.length > 0 ? "text-amber-600" : "text-green-600"}
            subtitle={sinCosto.length === 0 ? "Todo con costo" : "Requieren precio"}
          />
          <MetricCard
            label="Stock bajo"
            value={String(bajoStock.length)}
            valueColor={bajoStock.length > 0 ? "text-red-600" : "text-green-600"}
            subtitle={
              bajoStock.length > 0
                ? "Bajo punto de reposicion"
                : "Stock saludable"
            }
          />
          <MetricCard
            label="Valor en stock"
            value={`$${valorTotal.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            subtitle="Materiales en deposito"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filtroTipo}
          onValueChange={(v: string | null) => setFiltroTipo(v || "")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="servicio">Servicio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={insumosColumns as ColumnDef<{ id: string }>[]}
          data={insumos}
          onRowClick={(row: { id: string }) => router.push(`/insumos/${row.id}`)}
        />
      )}
    </div>
  )
}
