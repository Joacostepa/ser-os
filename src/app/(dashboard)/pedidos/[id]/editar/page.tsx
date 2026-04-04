"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { guardarEdicionPedido } from "@/lib/pedidos/editar-pedido"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeft, Trash2, Plus, AlertTriangle } from "lucide-react"
import Link from "next/link"

const ESTADOS_EDITABLES = [
  "nuevo",
  "pendiente_de_sena",
  "pendiente_sena",
  "habilitado",
  "en_prearmado",
  "bloqueado",
  "listo_para_armar",
  "en_armado",
]

const ESTADOS_CON_WARNING = ["listo_para_armar", "en_armado"]

const MOTIVO_CHIPS = [
  "Cliente pidio por WhatsApp",
  "Error en pedido original",
  "Ajuste de precio",
]

interface ItemForm {
  key: string
  producto_id: string | null
  variante_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export default function EditarPedidoPage() {
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedido, setPedido] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [snapshot, setSnapshot] = useState<any>(null)
  const [items, setItems] = useState<ItemForm[]>([])
  const [descuento, setDescuento] = useState(0)
  const [costoEnvio, setCostoEnvio] = useState(0)
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [warningAccepted, setWarningAccepted] = useState(false)

  const showWarning = pedido && ESTADOS_CON_WARNING.includes(pedido.estado_interno) && !warningAccepted

  const loadData = useCallback(async () => {
    const supabase = createClient()

    // Load pedido
    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos")
      .select("id, numero_tn, estado_interno, monto_total, monto_pagado, saldo_pendiente, descuento, costo_envio")
      .eq("id", pedidoId)
      .single()

    if (pedidoError || !pedidoData) {
      toast.error("Pedido no encontrado")
      router.push("/pedidos")
      return
    }

    if (!ESTADOS_EDITABLES.includes(pedidoData.estado_interno)) {
      toast.error("Este pedido no se puede editar en su estado actual")
      router.push(`/pedidos/${pedidoId}`)
      return
    }

    setPedido(pedidoData)
    setDescuento(Number(pedidoData.descuento || 0))
    setCostoEnvio(Number(pedidoData.costo_envio || 0))

    // Load items
    const { data: itemsData } = await supabase
      .from("items_pedido")
      .select("id, producto_id, variante_id, descripcion, cantidad, precio_unitario")
      .eq("pedido_id", pedidoId)

    if (itemsData) {
      setItems(
        itemsData.map((item) => ({
          key: item.id,
          producto_id: item.producto_id,
          variante_id: item.variante_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        }))
      )
    }

    // Load snapshot
    const { data: snapshotData } = await supabase
      .from("pedido_snapshot_tn")
      .select("*")
      .eq("pedido_id", pedidoId)
      .single()

    if (snapshotData) {
      setSnapshot(snapshotData)
    }

    setLoading(false)
  }, [pedidoId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0
  )
  const total = Math.round((subtotal - descuento + costoEnvio) * 100) / 100
  const totalPagado = Number(pedido?.monto_pagado || 0)
  const snapshotTotal = snapshot ? Number(snapshot.monto_total) : null
  const diferencia = snapshotTotal !== null ? total - snapshotTotal : null

  // Item handlers
  const updateItem = (key: string, field: keyof ItemForm, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    )
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        producto_id: null,
        variante_id: null,
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
      },
    ])
  }

  // Save handler
  const handleSave = async () => {
    // Validations
    if (items.length === 0) {
      toast.error("Debe haber al menos un producto")
      return
    }

    for (const item of items) {
      if (!item.descripcion.trim()) {
        toast.error("Todos los productos deben tener descripcion")
        return
      }
      if (item.cantidad <= 0) {
        toast.error(`La cantidad de "${item.descripcion}" debe ser mayor a 0`)
        return
      }
      if (item.precio_unitario <= 0) {
        toast.error(`El precio de "${item.descripcion}" debe ser mayor a 0`)
        return
      }
    }

    if (!motivo.trim()) {
      toast.error("Debe indicar un motivo para la edicion")
      return
    }

    if (totalPagado > total + 0.01) {
      toast.error(
        `El nuevo total ($${total.toLocaleString("es-AR")}) es menor que lo ya cobrado ($${totalPagado.toLocaleString("es-AR")})`
      )
      return
    }

    setSaving(true)
    try {
      await guardarEdicionPedido({
        pedidoId,
        items: items.map((item) => ({
          producto_id: item.producto_id,
          variante_id: item.variante_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
        descuento,
        costoEnvio,
        motivo: motivo.trim(),
      })

      toast.success("Pedido editado correctamente")
      router.push(`/pedidos/${pedidoId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Cargando pedido...</p>
      </div>
    )
  }

  if (!pedido) return null

  const numeroPedido = pedido.numero_tn || pedido.id.slice(0, 8)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/pedidos/${pedidoId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <p className="text-sm text-stone-400">Volver al pedido #{numeroPedido}</p>
          <h1 className="text-xl font-medium text-stone-800">Editar pedido</h1>
        </div>
      </div>

      {/* Warning banner */}
      {showWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Este pedido ya esta en etapa de armado. Editar puede afectar el proceso actual.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Asegurate de que el equipo de armado sea notificado de los cambios.
              </p>
              <div className="flex gap-2 mt-3">
                <Link href={`/pedidos/${pedidoId}`}>
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => setWarningAccepted(true)}
                >
                  Si, editar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content — hidden behind warning if applicable */}
      {!showWarning && (
        <>
          {/* Items section */}
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="px-4 py-3 border-b border-stone-100">
              <h2 className="text-sm font-medium text-stone-700">Productos</h2>
            </div>

            <div className="divide-y divide-stone-100">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_80px_100px_90px_40px] gap-2 px-4 py-2 text-xs text-stone-400">
                <span>Descripcion</span>
                <span className="text-right">Cantidad</span>
                <span className="text-right">Precio unit.</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>

              {items.map((item) => {
                const itemSubtotal = item.cantidad * item.precio_unitario
                return (
                  <div
                    key={item.key}
                    className="grid grid-cols-[1fr_80px_100px_90px_40px] gap-2 px-4 py-2 items-center"
                  >
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateItem(item.key, "descripcion", e.target.value)}
                      placeholder="Descripcion del producto"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={item.cantidad || ""}
                      onChange={(e) =>
                        updateItem(item.key, "cantidad", Number(e.target.value))
                      }
                      min={1}
                      className="h-8 text-sm font-mono text-right"
                    />
                    <Input
                      type="number"
                      value={item.precio_unitario || ""}
                      onChange={(e) =>
                        updateItem(item.key, "precio_unitario", Number(e.target.value))
                      }
                      min={0}
                      step={0.01}
                      className="h-8 text-sm font-mono text-right"
                    />
                    <span className="text-sm font-mono text-right text-stone-600">
                      ${itemSubtotal.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-stone-400 hover:text-red-500"
                      onClick={() => removeItem(item.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Add item */}
            <div className="px-4 py-3 border-t border-stone-100">
              <Button
                variant="ghost"
                size="sm"
                className="text-stone-500 hover:text-stone-700"
                onClick={addItem}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agregar producto
              </Button>
            </div>

            {/* Totals footer */}
            <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">Subtotal</span>
                <span className="text-sm font-mono text-stone-700">
                  ${subtotal.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">Descuento</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-400">-$</span>
                  <Input
                    type="number"
                    value={descuento || ""}
                    onChange={(e) => setDescuento(Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="h-7 w-24 text-sm font-mono text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">Envio</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-400">+$</span>
                  <Input
                    type="number"
                    value={costoEnvio || ""}
                    onChange={(e) => setCostoEnvio(Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="h-7 w-24 text-sm font-mono text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <span className="text-sm font-medium text-stone-800">TOTAL</span>
                <span className="text-base font-medium font-mono text-stone-900">
                  ${total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </span>
              </div>

              {totalPagado > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Pagado</span>
                  <span className="font-mono text-stone-500">
                    ${totalPagado.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}

              {snapshotTotal !== null && (
                <div className="pt-2 border-t border-stone-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">Total original (TN)</span>
                    <span className="font-mono text-stone-400">
                      ${snapshotTotal.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {diferencia !== null && diferencia !== 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">Diferencia</span>
                      <span
                        className={`font-mono ${
                          diferencia > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {diferencia > 0 ? "+" : ""}${diferencia.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Motivo section */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-medium text-stone-700">Motivo de edicion</h2>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por que se edita este pedido?"
              className="min-h-[80px] text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {MOTIVO_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMotivo(chip)}
                  className="px-3 py-1 rounded-full text-xs border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Link href={`/pedidos/${pedidoId}`}>
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
