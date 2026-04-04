"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { registrarRecepcion } from "@/lib/actions/compras"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CALIDAD_RECEPCION } from "@/lib/constants"
import { ArrowLeft, Check } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ItemRecepcion {
  item_compra_id: string
  descripcion: string
  cantidad_pedida: number
  cantidad_ya_recibida: number
  cantidad_ahora: number
  calidad: string
  notas: string
}

export default function RecepcionPage() {
  const params = useParams<{ id: string }>()
  const compraId = params.id
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compra, setCompra] = useState<any>(null)
  const [items, setItems] = useState<ItemRecepcion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notasRecepcion, setNotasRecepcion] = useState("")
  const [esFinal, setEsFinal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: compraData } = await supabase
      .from("compras")
      .select(`
        id,
        numero_orden,
        proveedor:proveedores(id, nombre),
        fecha_esperada,
        items:items_compra(
          id,
          descripcion,
          cantidad,
          cantidad_recibida,
          producto:productos(id, nombre)
        )
      `)
      .eq("id", compraId)
      .single()

    if (compraData) {
      setCompra(compraData)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsForm = (compraData.items ?? []).map((item: any) => ({
        item_compra_id: item.id,
        descripcion: item.descripcion || item.producto?.nombre || "---",
        cantidad_pedida: Number(item.cantidad),
        cantidad_ya_recibida: Number(item.cantidad_recibida),
        cantidad_ahora: 0,
        calidad: "ok",
        notas: "",
      }))
      setItems(itemsForm)
    }

    setLoading(false)
  }, [compraId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function updateItem(
    index: number,
    field: keyof ItemRecepcion,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit() {
    const itemsConCantidad = items.filter((i) => i.cantidad_ahora > 0)
    if (itemsConCantidad.length === 0) {
      toast.error("Indica la cantidad recibida de al menos un item")
      return
    }

    setSubmitting(true)
    try {
      await registrarRecepcion({
        compra_id: compraId,
        items: itemsConCantidad.map((i) => ({
          item_compra_id: i.item_compra_id,
          cantidad_recibida: i.cantidad_ahora,
          estado_calidad: i.calidad,
          notas: i.notas || undefined,
        })),
        notas: notasRecepcion || undefined,
        es_final: esFinal,
      })
      toast.success("Recepcion registrada")
      router.push(`/compras/${compraId}`)
    } catch {
      toast.error("Error al registrar recepcion")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!compra) {
    return (
      <div className="text-center py-12 text-stone-400">
        No se encontro la compra
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/compras/${compraId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-medium text-stone-900">
            Registrar recepcion
          </h1>
          <p className="text-sm text-stone-400">
            OC {compra.numero_orden || compra.id.slice(0, 8)}
            {" --- "}
            {compra.proveedor?.nombre}
            {compra.fecha_esperada &&
              ` --- Entrega: ${format(
                new Date(compra.fecha_esperada),
                "dd/MM/yyyy",
                { locale: es }
              )}`}
          </p>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-stone-800">Items</h2>

        {/* Header */}
        <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_120px_1fr] gap-2 text-xs text-stone-400 font-medium uppercase tracking-wide px-1">
          <span>Item</span>
          <span className="text-right">Pedido</span>
          <span className="text-right">Recibido</span>
          <span className="text-right">Ahora</span>
          <span>Calidad</span>
          <span>Notas</span>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const pendiente =
              item.cantidad_pedida - item.cantidad_ya_recibida
            const completado = pendiente <= 0

            return (
              <div
                key={item.item_compra_id}
                className={`grid grid-cols-1 md:grid-cols-[1fr_80px_80px_80px_120px_1fr] gap-2 items-center py-2 ${
                  completado ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {completado && (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      completado
                        ? "text-stone-400 line-through"
                        : "text-stone-800"
                    }`}
                  >
                    {item.descripcion}
                  </span>
                </div>
                <span className="font-mono text-sm text-stone-500 text-right">
                  {item.cantidad_pedida}
                </span>
                <span className="font-mono text-sm text-stone-500 text-right">
                  {item.cantidad_ya_recibida}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={pendiente > 0 ? pendiente : 0}
                  value={item.cantidad_ahora}
                  onChange={(e) =>
                    updateItem(
                      idx,
                      "cantidad_ahora",
                      Math.min(
                        parseInt(e.target.value) || 0,
                        pendiente > 0 ? pendiente : 0
                      )
                    )
                  }
                  disabled={completado}
                  className="font-mono text-right"
                />
                <Select
                  value={item.calidad}
                  onValueChange={(v: string | null) =>
                    v && updateItem(idx, "calidad", v)
                  }
                  disabled={completado}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CALIDAD_RECEPCION).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {item.calidad !== "ok" ? (
                  <Input
                    placeholder="Detalle calidad..."
                    value={item.notas}
                    onChange={(e) =>
                      updateItem(idx, "notas", e.target.value)
                    }
                    disabled={completado}
                  />
                ) : (
                  <span className="text-xs text-stone-300">---</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Options */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={esFinal}
            onCheckedChange={(v) => setEsFinal(v === true)}
          />
          <Label className="text-sm text-stone-700">
            Marcar como recepcion final (cierra la orden aunque falten items)
          </Label>
        </div>
        <div className="space-y-2">
          <Label className="text-stone-600">Notas de recepcion</Label>
          <Textarea
            value={notasRecepcion}
            onChange={(e) => setNotasRecepcion(e.target.value)}
            rows={2}
            placeholder="Observaciones generales de la recepcion..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href={`/compras/${compraId}`}>
          <Button variant="outline" disabled={submitting}>
            Cancelar
          </Button>
        </Link>
        <Button disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Registrando..." : "Registrar recepcion"}
        </Button>
      </div>
    </div>
  )
}
