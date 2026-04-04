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
import { Plus, Search, Trash2 } from "lucide-react"
import { crearCompra } from "@/lib/actions/compras"
import { ESTADO_COMPRA_CONFIG } from "@/lib/constants"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"
import type { EstadoCompra } from "@/types/database"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const comprasColumns: ColumnDef<any>[] = [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.id.slice(0, 8)}</span>
    ),
  },
  {
    accessorKey: "proveedor",
    header: "Proveedor",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.proveedor?.nombre}</span>
    ),
  },
  {
    accessorKey: "pedido",
    header: "Pedido",
    cell: ({ row }) =>
      row.original.pedido
        ? `#${row.original.pedido.numero_tn || row.original.pedido.id.slice(0, 8)}`
        : "—",
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const config = ESTADO_COMPRA_CONFIG[row.original.estado as EstadoCompra]
      return <Badge variant="secondary" className={config?.color}>{config?.label}</Badge>
    },
  },
  {
    accessorKey: "fecha_pedido",
    header: "Fecha pedido",
    cell: ({ row }) => format(new Date(row.original.fecha_pedido), "dd/MM/yyyy", { locale: es }),
  },
  {
    accessorKey: "fecha_esperada",
    header: "Entrega esperada",
    cell: ({ row }) =>
      row.original.fecha_esperada
        ? format(new Date(row.original.fecha_esperada), "dd/MM/yyyy", { locale: es })
        : "—",
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => row.original.items?.[0]?.count ?? 0,
  },
]

interface ItemForm {
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export default function ComprasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compras, setCompras] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proveedores, setProveedores] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [proveedorId, setProveedorId] = useState("")
  const [pedidoId, setPedidoId] = useState("")
  const [fechaEsperada, setFechaEsperada] = useState("")
  const [notas, setNotas] = useState("")
  const [items, setItems] = useState<ItemForm[]>([{ descripcion: "", cantidad: 1, precio_unitario: 0 }])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetch() {
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

      const { data } = await query
      setCompras(data || [])
      setLoading(false)
    }
    fetch()
  }, [filtroEstado])

  useEffect(() => {
    async function fetchSelects() {
      const [{ data: provs }, { data: peds }] = await Promise.all([
        supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("pedidos").select("id, numero_tn").order("created_at", { ascending: false }).limit(50),
      ])
      setProveedores(provs || [])
      setPedidos(peds || [])
    }
    fetchSelects()
  }, [])

  function addItem() {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0 }])
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  function updateItem(index: number, field: keyof ItemForm, value: string | number) {
    setItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!proveedorId) {
      toast.error("Seleccioná un proveedor")
      return
    }
    if (items.some((i) => !i.descripcion.trim())) {
      toast.error("Completá la descripción de todos los items")
      return
    }

    setSubmitting(true)
    try {
      await crearCompra({
        proveedor_id: proveedorId,
        pedido_id: pedidoId || undefined,
        fecha_esperada: fechaEsperada || undefined,
        notas: notas || undefined,
        items: items.map((i) => ({
          descripcion: i.descripcion.trim(),
          cantidad: Number(i.cantidad),
          precio_unitario: Number(i.precio_unitario),
        })),
      })
      toast.success("Compra creada")
      setDialogOpen(false)
      setProveedorId("")
      setPedidoId("")
      setFechaEsperada("")
      setNotas("")
      setItems([{ descripcion: "", cantidad: 1, precio_unitario: 0 }])
      window.location.reload()
    } catch {
      toast.error("Error al crear la compra")
    } finally {
      setSubmitting(false)
    }
  }

  const montoTotal = items.reduce((sum, i) => sum + (Number(i.cantidad) * Number(i.precio_unitario)), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Órdenes de compra a proveedores</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva compra
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva orden de compra</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrear} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select value={proveedorId} onValueChange={(v) => v && setProveedorId(v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {proveedores.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pedido vinculado (opcional)</Label>
                  <Select value={pedidoId} onValueChange={(v) => v && setPedidoId(v)}>
                    <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                    <SelectContent>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {pedidos.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          #{p.numero_tn || p.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha esperada de entrega</Label>
                <Input type="date" value={fechaEsperada} onChange={(e) => setFechaEsperada(e.target.value)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar item
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Descripción *"
                          value={item.descripcion}
                          onChange={(e) => updateItem(idx, "descripcion", e.target.value)}
                          required
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Cant."
                          min={1}
                          value={item.cantidad}
                          onChange={(e) => updateItem(idx, "cantidad", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="Precio"
                          min={0}
                          step={0.01}
                          value={item.precio_unitario}
                          onChange={(e) => updateItem(idx, "precio_unitario", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {montoTotal > 0 && (
                  <p className="text-sm text-right font-medium">
                    Total: ${montoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creando..." : "Crear orden de compra"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v || "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(ESTADO_COMPRA_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={comprasColumns as ColumnDef<{ id: string }>[]}
          data={compras}
          onRowClick={(row: { id: string }) => router.push(`/compras/${row.id}`)}
        />
      )}
    </div>
  )
}
