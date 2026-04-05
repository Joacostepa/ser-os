"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { registrarPago } from "@/lib/pagos"
import type { PagoInput } from "@/lib/pagos"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

interface RegistrarPagoModalProps {
  open: boolean
  onClose: () => void
  pedidoId: string
  clienteId: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  numeroPedido: string | null
  canal?: string
  cantidadPagos?: number
  onSuccess?: () => void
}

function calcularTipoPago(monto: number, saldoPendiente: number, montoPagado: number): PagoInput["tipo_pago"] {
  const cubreTodo = Math.abs(monto - saldoPendiente) < 0.01
  const tienePagosAnteriores = montoPagado > 0

  if (cubreTodo && !tienePagosAnteriores) return "total"
  if (cubreTodo && tienePagosAnteriores) return "saldo"
  if (!cubreTodo && !tienePagosAnteriores) return "anticipo"
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
  canal,
  cantidadPagos,
  onSuccess,
}: RegistrarPagoModalProps) {
  const [pagaTodo, setPagaTodo] = useState(true)
  const [monto, setMonto] = useState("")
  const [metodo, setMetodo] = useState("")
  const [fecha, setFecha] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [generarRecibo, setGenerarRecibo] = useState(true)
  const [loading, setLoading] = useState(false)
  const montoInputRef = useRef<HTMLInputElement>(null)

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setPagaTodo(true)
      setMonto(saldoPendiente.toString())
      setMetodo("")
      setFecha(new Date().toISOString().split("T")[0])
      setObservaciones("")
      setGenerarRecibo(true)
      setLoading(false)
    }
  }, [open, saldoPendiente])

  function handleRadioChange(todo: boolean) {
    setPagaTodo(todo)
    if (todo) {
      setMonto(saldoPendiente.toString())
    } else {
      setMonto("")
      setTimeout(() => montoInputRef.current?.focus(), 50)
    }
  }

  const montoNum = parseFloat(monto) || 0
  const montoExcedeSaldo = !pagaTodo && montoNum > 0 && montoNum >= saldoPendiente - 0.01

  async function handleSubmit() {
    const montoFinal = pagaTodo ? saldoPendiente : montoNum

    if (montoFinal <= 0) {
      toast.error("El monto debe ser mayor a $0")
      return
    }
    if (montoFinal > saldoPendiente + 0.01) {
      toast.error("El monto excede el saldo pendiente")
      return
    }
    if (!metodo) {
      toast.error("Seleccioná un método de pago")
      return
    }
    if (!fecha) {
      toast.error("Seleccioná una fecha")
      return
    }

    const tipoPago = calcularTipoPago(montoFinal, saldoPendiente, montoPagado)

    setLoading(true)
    try {
      await registrarPago({
        pedido_id: pedidoId,
        cliente_id: clienteId,
        monto: montoFinal,
        tipo_pago: tipoPago,
        metodo_pago: metodo,
        fecha,
        origen: "manual",
        observaciones: observaciones || undefined,
        generar_recibo: generarRecibo,
      })

      toast.success(`Pago de $${montoFinal.toLocaleString("es-AR")} registrado`)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar pago")
    } finally {
      setLoading(false)
    }
  }

  const esTiendaNube = canal === "tienda_nube"
  const tienePagosAnteriores = montoPagado > 0

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

        {/* If fully paid, show message instead of form */}
        {saldoPendiente <= 0 ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-stone-700">
              Este pedido ya está pagado en su totalidad.
            </p>
            <div className="bg-stone-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Total</span>
                <span className="font-[Geist_Mono] text-stone-800">${montoTotal.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cobrado{cantidadPagos ? ` (${cantidadPagos} pago${cantidadPagos > 1 ? "s" : ""})` : ""}</span>
                <span className="font-[Geist_Mono] text-green-600">${montoPagado.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Saldo</span>
                <span className="font-[Geist_Mono] text-green-600">$0</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary box */}
            <div className="rounded-lg bg-stone-50 p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Total del pedido</span>
                <span className="font-[Geist_Mono] text-stone-800">${montoTotal.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">
                  Cobrado{cantidadPagos && cantidadPagos > 0 ? ` (${cantidadPagos} pago${cantidadPagos > 1 ? "s" : ""})` : ""}
                </span>
                <span className={`font-[Geist_Mono] ${montoPagado > 0 ? "text-green-600" : "text-stone-800"}`}>
                  ${montoPagado.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Saldo pendiente</span>
                <span className="font-[Geist_Mono] text-red-500 font-medium">
                  ${saldoPendiente.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            {/* Radio: Paga todo / Paga una parte */}
            <div className="space-y-2">
              <Label className="text-stone-700">¿Cuánto pagó?</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pagaTodo"
                    checked={pagaTodo}
                    onChange={() => handleRadioChange(true)}
                    className="accent-stone-800"
                  />
                  <span className="text-sm text-stone-700">
                    {tienePagosAnteriores
                      ? `Paga el saldo completo ($${saldoPendiente.toLocaleString("es-AR")})`
                      : `Paga todo ($${saldoPendiente.toLocaleString("es-AR")})`}
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pagaTodo"
                    checked={!pagaTodo}
                    onChange={() => handleRadioChange(false)}
                    className="accent-stone-800"
                  />
                  <span className="text-sm text-stone-700">Paga una parte</span>
                </label>
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label>Monto</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                <Input
                  ref={montoInputRef}
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`pl-6 font-[Geist_Mono] ${pagaTodo ? "bg-stone-50 text-stone-500" : "bg-white text-stone-800"}`}
                  placeholder="0"
                  min={0}
                  max={saldoPendiente}
                  step={0.01}
                  disabled={pagaTodo}
                />
              </div>
              {montoExcedeSaldo && (
                <p className="text-xs text-amber-600">
                  Ese monto cubre el saldo completo. ¿Querés registrar como pago total?
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={metodo} onValueChange={(v: string | null) => v && setMetodo(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar método de pago..." />
                </SelectTrigger>
                <SelectContent>
                  {esTiendaNube ? (
                    <>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] uppercase tracking-wider text-stone-400">Pasarelas</SelectLabel>
                        <SelectItem value="pago_nube_tarjeta">Pago Nube — Tarjeta</SelectItem>
                        <SelectItem value="pago_nube_transferencia">Pago Nube — Transferencia</SelectItem>
                        <SelectItem value="mercadopago">MercadoPago</SelectItem>
                        <SelectItem value="gocuotas">GOcuotas</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] uppercase tracking-wider text-stone-400">Directo</SelectLabel>
                        <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                      </SelectGroup>
                    </>
                  ) : (
                    <>
                      <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                    </>
                  )}
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
        )}

        {saldoPendiente > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || (!pagaTodo && !monto) || !metodo}>
              {loading ? "Registrando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
