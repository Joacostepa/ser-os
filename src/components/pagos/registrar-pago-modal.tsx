"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { registrarPago } from "@/lib/pagos"
import type { PagoInput } from "@/lib/pagos"
import { toast } from "sonner"

type TipoPago = PagoInput["tipo_pago"]

const METODOS_PAGO = [
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
]

const TIPO_PAGO_LABELS: Record<TipoPago, string> = {
  anticipo: "Anticipo / Sena",
  parcial: "Pago parcial",
  saldo: "Saldo final",
  total: "Pago total",
}

interface RegistrarPagoModalProps {
  open: boolean
  onClose: () => void
  pedidoId: string
  clienteId: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  numeroPedido: string | null
  onSuccess?: () => void
}

function getDefaultTipoPago(
  montoPagado: number,
  saldoPendiente: number,
  montoTotal: number,
): TipoPago {
  const esPrimerPago = montoPagado === 0
  if (esPrimerPago && saldoPendiente === montoTotal) return "total"
  if (esPrimerPago) return "anticipo"
  if (saldoPendiente > 0 && saldoPendiente === montoTotal - montoPagado) return "saldo"
  return "parcial"
}

export function RegistrarPagoModal({
  open,
  onClose,
  pedidoId,
  clienteId,
  montoTotal,
  montoPagado,
  saldoPendiente,
  numeroPedido,
  onSuccess,
}: RegistrarPagoModalProps) {
  const [tipoPago, setTipoPago] = useState<TipoPago>("total")
  const [monto, setMonto] = useState("")
  const [metodo, setMetodo] = useState("")
  const [fecha, setFecha] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [generarRecibo, setGenerarRecibo] = useState(true)
  const [loading, setLoading] = useState(false)

  // Reset form when opened
  useEffect(() => {
    if (open) {
      const defaultTipo = getDefaultTipoPago(montoPagado, saldoPendiente, montoTotal)
      setTipoPago(defaultTipo)
      setMonto(defaultTipo === "total" || defaultTipo === "saldo" ? saldoPendiente.toString() : "")
      setMetodo("")
      setFecha(new Date().toISOString().split("T")[0])
      setObservaciones("")
      setGenerarRecibo(true)
      setLoading(false)
    }
  }, [open, montoPagado, saldoPendiente, montoTotal])

  function handlePagarTodo() {
    setMonto(saldoPendiente.toString())
  }

  async function handleSubmit() {
    const montoNum = parseFloat(monto)

    if (!montoNum || montoNum <= 0) {
      toast.error("Ingresa un monto valido")
      return
    }
    if (montoNum > saldoPendiente + 0.01) {
      toast.error("El monto supera el saldo pendiente")
      return
    }
    if (!metodo) {
      toast.error("Selecciona un metodo de pago")
      return
    }
    if (!fecha) {
      toast.error("Selecciona una fecha")
      return
    }

    setLoading(true)
    try {
      await registrarPago({
        pedido_id: pedidoId,
        cliente_id: clienteId,
        monto: montoNum,
        tipo_pago: tipoPago,
        metodo_pago: metodo,
        fecha,
        origen: "manual",
        observaciones: observaciones || undefined,
        generar_recibo: generarRecibo,
      })

      toast.success(`Pago de $${montoNum.toLocaleString("es-AR")} registrado`)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          {numeroPedido && (
            <p className="text-xs text-stone-400 mt-1">
              Pedido #{numeroPedido}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary box */}
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Total</span>
              <span className="font-mono font-medium">${montoTotal.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Cobrado</span>
              <span className="font-mono text-green-600">${montoPagado.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Saldo</span>
              <span className={`font-mono font-medium ${saldoPendiente > 0 ? "text-red-600" : "text-green-600"}`}>
                ${saldoPendiente.toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          {/* Tipo de pago */}
          <div className="space-y-2">
            <Label>Tipo de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIPO_PAGO_LABELS) as TipoPago[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    setTipoPago(tipo)
                    if (tipo === "total" || tipo === "saldo") {
                      setMonto(saldoPendiente.toString())
                    }
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    tipoPago === tipo
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {TIPO_PAGO_LABELS[tipo]}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                <Input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="pl-6 font-mono"
                  placeholder="0"
                  min={0}
                  max={saldoPendiente}
                  step={0.01}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePagarTodo}
                className="shrink-0 text-xs"
              >
                Pagar todo
              </Button>
            </div>
          </div>

          {/* Metodo de pago */}
          <div className="space-y-2">
            <Label>Metodo de pago</Label>
            <Select value={metodo} onValueChange={(v: string | null) => v && setMetodo(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas internas sobre este pago..."
            />
          </div>

          {/* Generar recibo */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={generarRecibo}
              onCheckedChange={(checked) => setGenerarRecibo(checked === true)}
            />
            <Label className="text-sm font-normal text-stone-600 cursor-pointer">
              Generar recibo
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !monto || !metodo}>
            {loading ? "Registrando..." : "Registrar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
