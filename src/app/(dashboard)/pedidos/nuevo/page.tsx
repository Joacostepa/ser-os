"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { crearPedido } from "@/lib/actions/pedidos"
import { toast } from "sonner"

interface ItemForm {
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export default function NuevoPedidoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clienteId, setClienteId] = useState("")
  const [tipo, setTipo] = useState<"estandar" | "personalizado">("estandar")
  const [prioridad, setPrioridad] = useState<"urgente" | "normal" | "baja">("normal")
  const [fechaComprometida, setFechaComprometida] = useState("")
  const [tipoDespacho, setTipoDespacho] = useState<"envio" | "retiro_oficina">("envio")
  const [observaciones, setObservaciones] = useState("")
  const [items, setItems] = useState<ItemForm[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0 },
  ])

  // TODO: fetch real clients from Supabase
  const [clienteNombre, setClienteNombre] = useState("")

  function addItem() {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemForm, value: string | number) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const montoTotal = items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) {
      toast.error("Seleccioná un cliente")
      return
    }
    if (items.some((i) => !i.descripcion)) {
      toast.error("Completá la descripción de todos los items")
      return
    }

    setLoading(true)
    try {
      const pedido = await crearPedido({
        cliente_id: clienteId,
        tipo,
        prioridad,
        fecha_comprometida: fechaComprometida || null,
        tipo_despacho: tipoDespacho,
        observaciones: observaciones || null,
        monto_total: montoTotal,
        items: items.map((item) => ({
          producto_id: null,
          variante_id: null,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          costo_unitario: null,
          personalizacion: null,
        })),
      })

      toast.success("Pedido creado correctamente")
      router.push(`/pedidos/${pedido.id}`)
    } catch {
      toast.error("Error al crear el pedido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pedidos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nuevo pedido</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID del cliente</Label>
                <Input
                  placeholder="UUID del cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre (referencia)</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalles del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estandar">Estándar</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as typeof prioridad)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Despacho</Label>
                <Select value={tipoDespacho} onValueChange={(v) => setTipoDespacho(v as typeof tipoDespacho)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="envio">Envío</SelectItem>
                    <SelectItem value="retiro_oficina">Retiro en oficina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha comprometida de entrega</Label>
              <Input
                type="date"
                value={fechaComprometida}
                onChange={(e) => setFechaComprometida(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales del pedido..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    placeholder="Producto o servicio"
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, "cantidad", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Precio unit.</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.precio_unitario}
                    onChange={(e) => updateItem(index, "precio_unitario", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-28 text-right pt-5">
                  <span className="text-sm font-medium tabular-nums">
                    ${(item.cantidad * item.precio_unitario).toLocaleString("es-AR")}
                  </span>
                </div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            <div className="text-right pt-2 border-t">
              <span className="text-lg font-bold">
                Total: ${montoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/pedidos")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear pedido"}
          </Button>
        </div>
      </form>
    </div>
  )
}
