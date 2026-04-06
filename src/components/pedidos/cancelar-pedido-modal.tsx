"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cancelarPedido } from "@/lib/pedidos/cancelar-pedido"

const MOTIVOS_CANCELACION = [
  "Clienta desistió de la compra",
  "Falta de stock",
  "Error en el pedido",
  "Pedido duplicado",
  "No se pudo contactar a la clienta",
  "Otro",
]
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CancelarPedidoModal({ open, onClose, pedido, onSuccess }: { open: boolean; onClose: () => void; pedido: any; onSuccess?: () => void }) {
  const [motivo, setMotivo] = useState("")
  const [notas, setNotas] = useState("")
  const [devolverSaldo, setDevolverSaldo] = useState(false)
  const [devolucionMetodo, setDevolucionMetodo] = useState("transferencia")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const montoTotal = Number(pedido?.monto_total || 0)
  const montoPagado = Number(pedido?.monto_pagado || 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagos: any[] = pedido?.pagos || []
  const tienePagos = montoPagado > 0
  const numeroPedido = pedido?.numero_tn || pedido?.numero_interno || pedido?.id?.slice(0, 8)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clienteNombre = (pedido?.cliente as any)?.nombre || "Cliente"

  // Comisiones del pedido
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comisiones: any[] = pedido?.comisiones || []
  const totalComisiones = comisiones.reduce((s: number, c: { total_comisiones: number }) => s + Number(c.total_comisiones), 0)

  async function handleConfirmar() {
    if (!motivo) {
      toast.error("Seleccioná un motivo de cancelación")
      return
    }

    setLoading(true)
    try {
      const result = await cancelarPedido({
        pedido_id: pedido.id,
        motivo,
        notas: notas || undefined,
        origen: "manual",
        devolver_saldo: devolverSaldo,
        devolucion_metodo: devolverSaldo ? devolucionMetodo : undefined,
      })

      if (!result.ok) {
        toast.error(result.error || "Error al cancelar")
        return
      }

      let msg = "Pedido cancelado"
      if (result.saldo_favor) msg += ` · Saldo a favor: $${result.saldo_favor.toLocaleString("es-AR")}`
      toast.success(msg)
      onSuccess?.()
      router.refresh()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancelar pedido #{numeroPedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="text-sm text-stone-600 space-y-1">
            <p>Cliente: <span className="font-medium text-stone-800">{clienteNombre}</span></p>
            <p>Total: <span className="font-[Geist_Mono] font-medium">${montoTotal.toLocaleString("es-AR")}</span></p>
          </div>

          {/* Warning card if has payments */}
          {tienePagos && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Este pedido tiene pagos registrados:
              </p>
              <div className="space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pagos.map((p: any) => (
                  <p key={p.id} className="text-sm text-amber-700 pl-6">
                    <span className="font-[Geist_Mono]">${Number(p.monto).toLocaleString("es-AR")}</span>
                    {" — "}{p.metodo}
                    {" — "}{format(new Date(p.fecha), "dd/MM/yyyy", { locale: es })}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Consequences */}
          <div className="text-sm text-stone-600 space-y-1">
            <p className="font-medium text-stone-700 mb-1.5">Al cancelar:</p>
            <p>• El pedido pasa a estado "Cancelado"</p>
            <p>• Se cancelan las tareas pendientes</p>
            <p>• Se liberan los insumos reservados</p>
            {tienePagos && (
              <>
                <p>• Se anulan los asientos contables de venta y cobro</p>
                <p>• Se genera un saldo a favor de <span className="font-[Geist_Mono] font-medium">${montoPagado.toLocaleString("es-AR")}</span> para {clienteNombre}</p>
                {totalComisiones > 0 && (
                  <p>• La comisión de pasarela (<span className="font-[Geist_Mono] text-red-500">${totalComisiones.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>) no se recupera</p>
                )}
              </>
            )}
          </div>

          {/* Saldo option */}
          {tienePagos && (
            <div className="space-y-2">
              <Label className="text-stone-700">¿Qué hacer con el saldo a favor?</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="saldo" checked={!devolverSaldo} onChange={() => setDevolverSaldo(false)} className="accent-stone-800" />
                  <span className="text-sm text-stone-700">Mantener como saldo a favor de la clienta</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="saldo" checked={devolverSaldo} onChange={() => setDevolverSaldo(true)} className="accent-stone-800" />
                  <span className="text-sm text-stone-700">Devolver ahora</span>
                </label>
                {devolverSaldo && (
                  <div className="pl-7">
                    <Select value={devolucionMetodo} onValueChange={(v: string | null) => v && setDevolucionMetodo(v)}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo de cancelación *</Label>
            <Select value={motivo} onValueChange={(v: string | null) => v && setMotivo(v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_CANCELACION.filter((m) => m !== "Cancelado desde Tienda Nube").map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas adicionales</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Detalles sobre la cancelación..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Volver</Button>
          <Button
            onClick={handleConfirmar}
            disabled={loading || !motivo}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cancelando...</> : "Confirmar cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
