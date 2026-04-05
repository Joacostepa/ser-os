"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { transicionesValidas, estadoLabels, estadoStyles } from "@/lib/maquina-estados/transiciones"
import { actualizarEstadoPedido } from "@/lib/actions/pedidos"
import type { EstadoInterno } from "@/types/database"
import { toast } from "sonner"

const SUBESTADOS = [
  { value: "pago_pendiente", label: "Pago pendiente" },
  { value: "esperando_diseno", label: "Esperando diseño" },
  { value: "esperando_aprobacion", label: "Esperando aprobación del cliente" },
  { value: "esperando_insumo", label: "Esperando insumo de proveedor" },
  { value: "faltante_stock", label: "Faltante de stock" },
  { value: "otro", label: "Otro motivo" },
]

export function ChangeStatusModal({
  open,
  onClose,
  pedidoId,
  estadoActual,
}: {
  open: boolean
  onClose: () => void
  pedidoId: string
  estadoActual: EstadoInterno
}) {
  const [nuevoEstado, setNuevoEstado] = useState("")
  const [subestado, setSubestado] = useState("")
  const [motivo, setMotivo] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Get valid transitions from the state machine
  const destinos = transicionesValidas[estadoActual] || []

  // Filter out internal sentinel values
  const destinosVisibles = destinos.filter((d: { estado: string }) => !d.estado.startsWith("__"))

  const esBloqueado = nuevoEstado === "bloqueado"
  const esCancelacion = nuevoEstado === "cancelado"

  async function handleConfirmar() {
    if (!nuevoEstado) { toast.error("Seleccioná un estado"); return }
    if (esBloqueado && !subestado) { toast.error("Seleccioná el motivo de bloqueo"); return }
    if (esCancelacion && !motivo) { toast.error("Ingresá el motivo de cancelación"); return }

    setLoading(true)
    try {
      await actualizarEstadoPedido(pedidoId, nuevoEstado as EstadoInterno, {
        subestado: esBloqueado ? subestado : undefined,
        motivo: esCancelacion ? motivo : undefined,
        observaciones: observaciones || undefined,
      })
      const label = (estadoLabels as Record<string, string>)[nuevoEstado] || nuevoEstado
      toast.success(`Estado cambiado a "${label}"`)
      setNuevoEstado("")
      setSubestado("")
      setMotivo("")
      setObservaciones("")
      onClose()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado")
    } finally {
      setLoading(false)
    }
  }

  const estadoActualLabel = (estadoLabels as Record<string, string>)[estadoActual] || estadoActual
  const estadoActualStyle = (estadoStyles as Record<string, { bg: string; text: string }>)[estadoActual] || { bg: "bg-stone-100", text: "text-stone-600" }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado del pedido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">Estado actual:</span>
            <Badge variant="secondary" className={`${estadoActualStyle.bg} ${estadoActualStyle.text}`}>
              {estadoActualLabel}
            </Badge>
          </div>

          {destinosVisibles.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Nuevo estado</Label>
                <Select value={nuevoEstado} onValueChange={(v: string | null) => v && setNuevoEstado(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {destinosVisibles.map((d: { estado: string }) => {
                      const label = (estadoLabels as Record<string, string>)[d.estado] || d.estado
                      return <SelectItem key={d.estado} value={d.estado}>{label}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>

              {esBloqueado && (
                <div className="space-y-2">
                  <Label>Motivo de bloqueo *</Label>
                  <Select value={subestado} onValueChange={(v: string | null) => v && setSubestado(v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
                    <SelectContent>
                      {SUBESTADOS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {esCancelacion && (
                <div className="space-y-2">
                  <Label>Motivo de cancelación *</Label>
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: cliente desistió, fraude, etc." />
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleConfirmar} disabled={loading || !nuevoEstado}>
                  {loading ? "Cambiando..." : "Confirmar cambio"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-stone-400">Este pedido no tiene transiciones disponibles.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
