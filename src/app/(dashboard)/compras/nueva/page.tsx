"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { crearOrdenCompra } from "@/lib/actions/compras"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CONDICION_PAGO_OPTIONS } from "@/lib/constants"
import { formatearMontoCompleto } from "@/lib/formatters"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface ItemForm {
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export default function NuevaCompraPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proveedores, setProveedores] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Form state
  const [proveedorId, setProveedorId] = useState("")
  const [pedidoId, setPedidoId] = useState("")
  const [fechaOrden, setFechaOrden] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [fechaEntrega, setFechaEntrega] = useState("")
  const [condicionPago, setCondicionPago] = useState("")
  const [notas, setNotas] = useState("")
  const [notasInternas, setNotasInternas] = useState("")
  const [descuento, setDescuento] = useState(0)
  const [items, setItems] = useState<ItemForm[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0 },
  ])

  useEffect(() => {
    async function fetchSelects() {
      const [{ data: provs }, { data: peds }] = await Promise.all([
        supabase
          .from("proveedores")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("pedidos")
          .select("id, numero_tn")
          .order("created_at", { ascending: false })
          .limit(50),
      ])
      setProveedores(provs || [])
      setPedidos(peds || [])
      setLoading(false)
    }
    fetchSelects()
  }, [supabase])

  function addItem() {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0 }])
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  function updateItem(
    index: number,
    field: keyof ItemForm,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.cantidad) * Number(i.precio_unitario),
    0
  )
  const total = subtotal - descuento

  async function handleSubmit(estado: "borrador" | "enviada") {
    if (!proveedorId) {
      toast.error("Selecciona un proveedor")
      return
    }
    if (items.some((i) => !i.descripcion.trim())) {
      toast.error("Completa la descripcion de todos los items")
      return
    }

    setSubmitting(true)
    try {
      const compra = await crearOrdenCompra({
        proveedor_id: proveedorId,
        pedido_id: pedidoId || undefined,
        fecha_entrega_esperada: fechaEntrega || undefined,
        condicion_pago: condicionPago || undefined,
        items: items.map((i) => ({
          descripcion: i.descripcion.trim(),
          cantidad: Number(i.cantidad),
          precio_unitario: Number(i.precio_unitario),
        })),
        notas: notas || undefined,
        notas_internas: notasInternas || undefined,
        estado,
      })
      toast.success(
        estado === "borrador"
          ? "Orden guardada como borrador"
          : "Orden creada y enviada"
      )
      router.push(`/compras/${compra.id}`)
    } catch {
      toast.error("Error al crear la orden de compra")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/compras">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-medium text-stone-900">
            Nueva orden de compra
          </h1>
          <p className="text-sm text-stone-400">
            Completa los datos para crear una nueva OC
          </p>
        </div>
      </div>

      {/* Datos generales */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-stone-800">Datos generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-stone-600">Proveedor *</Label>
            <Select
              value={proveedorId}
              onValueChange={(v: string | null) => v && setProveedorId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar proveedor..." />
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
            <Label className="text-stone-600">Pedido vinculado (opcional)</Label>
            <Select
              value={pedidoId}
              onValueChange={(v: string | null) => v && setPedidoId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ninguno" />
              </SelectTrigger>
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
          <div className="space-y-2">
            <Label className="text-stone-600">Fecha orden</Label>
            <Input
              type="date"
              value={fechaOrden}
              onChange={(e) => setFechaOrden(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-600">Fecha entrega esperada</Label>
            <Input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-600">Condicion de pago</Label>
            <Select
              value={condicionPago}
              onValueChange={(v: string | null) => v && setCondicionPago(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {CONDICION_PAGO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-800">Items</h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" /> Agregar item
          </Button>
        </div>

        {/* Header row */}
        <div className="hidden md:grid grid-cols-[1fr_80px_120px_120px_32px] gap-2 text-xs text-stone-400 font-medium uppercase tracking-wide px-1">
          <span>Descripcion</span>
          <span className="text-right">Cantidad</span>
          <span className="text-right">Precio unit.</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const itemSubtotal =
              Number(item.cantidad) * Number(item.precio_unitario)
            return (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_120px_32px] gap-2 items-center"
              >
                <Input
                  placeholder="Descripcion del item *"
                  value={item.descripcion}
                  onChange={(e) =>
                    updateItem(idx, "descripcion", e.target.value)
                  }
                />
                <Input
                  type="number"
                  placeholder="Cant."
                  min={1}
                  value={item.cantidad}
                  onChange={(e) =>
                    updateItem(idx, "cantidad", parseInt(e.target.value) || 1)
                  }
                  className="font-mono text-right"
                />
                <Input
                  type="number"
                  placeholder="Precio"
                  min={0}
                  step={0.01}
                  value={item.precio_unitario}
                  onChange={(e) =>
                    updateItem(
                      idx,
                      "precio_unitario",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="font-mono text-right"
                />
                <div className="font-mono text-sm text-stone-700 text-right pr-1">
                  {formatearMontoCompleto(itemSubtotal)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-stone-400" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Subtotal</span>
          <span className="font-mono text-stone-800">
            {formatearMontoCompleto(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Descuento</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={descuento}
            onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
            className="w-32 font-mono text-right"
          />
        </div>
        <div className="flex items-center justify-between text-sm border-t border-stone-200 pt-3">
          <span className="font-medium text-stone-800">Total</span>
          <span className="font-mono font-medium text-stone-900 text-lg">
            {formatearMontoCompleto(total)}
          </span>
        </div>
      </div>

      {/* Notas */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-stone-800">Notas</h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-stone-600">Notas para el proveedor</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Instrucciones de entrega, especificaciones..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-600">Notas internas</Label>
            <Textarea
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              rows={2}
              placeholder="Notas internas del equipo..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/compras">
          <Button variant="outline" disabled={submitting}>
            Cancelar
          </Button>
        </Link>
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => handleSubmit("borrador")}
        >
          {submitting ? "Guardando..." : "Guardar como borrador"}
        </Button>
        <Button
          disabled={submitting}
          onClick={() => handleSubmit("enviada")}
        >
          {submitting ? "Guardando..." : "Guardar y enviar"}
        </Button>
      </div>
    </div>
  )
}
