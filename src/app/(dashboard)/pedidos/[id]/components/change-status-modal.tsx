"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import { actualizarEstadoPedido } from "@/lib/actions/pedidos"
import type { EstadoInterno } from "@/types/database"
import { toast } from "sonner"

const TRANSICIONES: Record<string, EstadoInterno[]> = {
  nuevo: ["pendiente_sena", "sena_recibida", "cancelado"],
  pendiente_sena: ["sena_recibida", "cancelado"],
  sena_recibida: ["en_prearmado", "cancelado"],
  en_prearmado: ["esperando_insumos", "esperando_diseno", "listo_para_armar", "cancelado"],
  esperando_insumos: ["insumos_recibidos", "en_prearmado", "cancelado"],
  esperando_diseno: ["en_prearmado", "cancelado"],
  insumos_recibidos: ["listo_para_armar", "cancelado"],
  listo_para_armar: ["en_armado", "cancelado"],
  en_armado: ["armado_completo", "cancelado"],
  armado_completo: ["pendiente_saldo", "listo_para_despacho", "cancelado"],
  pendiente_saldo: ["listo_para_despacho", "cancelado"],
  listo_para_despacho: ["en_preparacion_envio", "despachado", "cancelado"],
  en_preparacion_envio: ["despachado", "cancelado"],
  despachado: ["cerrado"],
  cerrado: [],
  cancelado: [],
}

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
  const [observaciones, setObservaciones] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const transiciones = TRANSICIONES[estadoActual] || []
  const estadoConfig = ESTADOS_INTERNOS[estadoActual]

  async function handleConfirmar() {
    if (!nuevoEstado) { toast.error("Seleccioná un estado"); return }

    setLoading(true)
    try {
      await actualizarEstadoPedido(pedidoId, nuevoEstado as EstadoInterno)
      toast.success(`Estado cambiado a "${ESTADOS_INTERNOS[nuevoEstado as EstadoInterno]?.label}"`)
      setNuevoEstado("")
      setObservaciones("")
      onClose()
      router.refresh()
    } catch {
      toast.error("Error al cambiar estado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado del pedido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Estado actual:</span>
            <Badge variant="secondary" className={estadoConfig?.bgColor}>{estadoConfig?.label}</Badge>
          </div>

          {transiciones.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Nuevo estado</Label>
                <Select value={nuevoEstado} onValueChange={(v: string | null) => v && setNuevoEstado(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {transiciones.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {ESTADOS_INTERNOS[estado]?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            <p className="text-sm text-muted-foreground">Este pedido no tiene transiciones disponibles.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
