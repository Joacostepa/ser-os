"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, AlertTriangle } from "lucide-react"
import { crearInsumo } from "@/lib/actions/insumos"
import { TIPO_INSUMO_CONFIG, UNIDAD_INSUMO_CONFIG } from "@/lib/constants"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"
import type { TipoInsumo, UnidadInsumo } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const insumosColumns: ColumnDef<any>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => {
      const bajoStock = row.original.tipo === "material" &&
        Number(row.original.stock_actual) <= Number(row.original.stock_minimo) &&
        Number(row.original.stock_minimo) > 0
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.nombre}</span>
          {bajoStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        </div>
      )
    },
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => {
      const config = TIPO_INSUMO_CONFIG[row.original.tipo as TipoInsumo]
      return <Badge variant="secondary" className={config?.color}>{config?.label}</Badge>
    },
  },
  {
    accessorKey: "stock_actual",
    header: "Stock",
    cell: ({ row }) => {
      const unidad = UNIDAD_INSUMO_CONFIG[row.original.unidad as UnidadInsumo]
      if (row.original.tipo === "servicio") return "—"
      return (
        <span className="tabular-nums">
          {Number(row.original.stock_actual).toLocaleString("es-AR")} {unidad?.short}
        </span>
      )
    },
  },
  {
    accessorKey: "stock_minimo",
    header: "Mínimo",
    cell: ({ row }) => {
      const unidad = UNIDAD_INSUMO_CONFIG[row.original.unidad as UnidadInsumo]
      if (row.original.tipo === "servicio") return "—"
      return (
        <span className="tabular-nums text-muted-foreground">
          {Number(row.original.stock_minimo).toLocaleString("es-AR")} {unidad?.short}
        </span>
      )
    },
  },
  {
    accessorKey: "costo_unitario",
    header: "Costo unit.",
    cell: ({ row }) => {
      const unidad = UNIDAD_INSUMO_CONFIG[row.original.unidad as UnidadInsumo]
      return (
        <span className="tabular-nums">
          ${Number(row.original.costo_unitario).toLocaleString("es-AR")}/{unidad?.short}
        </span>
      )
    },
  },
  {
    accessorKey: "unidad_compra",
    header: "Compra",
    cell: ({ row }) => {
      if (!row.original.unidad_compra) return "—"
      return `${row.original.unidad_compra} (×${row.original.rendimiento})`
    },
  },
  {
    accessorKey: "proveedor",
    header: "Proveedor",
    cell: ({ row }) => row.original.proveedor?.nombre || "—",
  },
]

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

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let query = supabase
        .from("insumos")
        .select("*, proveedor:proveedores(id, nombre)")
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
    }
    fetch()
  }, [busqueda, filtroTipo])

  useEffect(() => {
    supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre")
      .then(({ data }) => setProveedores(data || []))
  }, [])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { toast.error("El nombre es requerido"); return }

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
      setNombre(""); setStockMinimo(0); setCostoUnitario(0)
      setUnidadCompra(""); setRendimiento(1); setProveedorId(""); setNotas("")
      window.location.reload()
    } catch {
      toast.error("Error al crear el insumo")
    } finally {
      setSubmitting(false)
    }
  }

  const bajoStockCount = insumos.filter(
    (i) => i.tipo === "material" && Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insumos</h1>
          <p className="text-sm text-muted-foreground">Materiales y servicios para producción</p>
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
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v: string | null) => v && setTipo(v as TipoInsumo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_INSUMO_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad de uso</Label>
                  <Select value={unidad} onValueChange={(v: string | null) => v && setUnidad(v as UnidadInsumo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIDAD_INSUMO_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label} ({v.short})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock mínimo</Label>
                  <Input type="number" min={0} step={0.01} value={stockMinimo} onChange={(e) => setStockMinimo(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Costo unitario ($)</Label>
                  <Input type="number" min={0} step={0.01} value={costoUnitario} onChange={(e) => setCostoUnitario(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unidad de compra</Label>
                  <Input placeholder="Ej: Bidón 5L, Rollo, Plancha" value={unidadCompra} onChange={(e) => setUnidadCompra(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rendimiento (×)</Label>
                  <Input type="number" min={1} step={0.01} value={rendimiento} onChange={(e) => setRendimiento(parseFloat(e.target.value) || 1)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Proveedor habitual</Label>
                <Select value={proveedorId} onValueChange={(v: string | null) => v && setProveedorId(v)}>
                  <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {proveedores.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creando..." : "Crear insumo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bajoStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          {bajoStockCount} insumo{bajoStockCount > 1 ? "s" : ""} con stock bajo mínimo
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-8" />
        </div>
        <Select value={filtroTipo} onValueChange={(v: string | null) => setFiltroTipo(v || "")}>
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
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
