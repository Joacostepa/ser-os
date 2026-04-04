"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { actualizarEstadoCompra } from "@/lib/actions/compras"
import { ESTADO_COMPRA_CONFIG } from "@/lib/constants"
import type { EstadoCompra } from "@/types/database"
import { toast } from "sonner"
import { CheckCircle2, Loader2 } from "lucide-react"

const TRANSICIONES: Record<EstadoCompra, EstadoCompra[]> = {
  borrador: ["enviada", "cancelada"],
  enviada: ["confirmada", "cancelada"],
  confirmada: ["recibida_parcial", "recibida", "cancelada"],
  recibida_parcial: ["recibida"],
  recibida: [],
  cancelada: [],
}

export function CompraActions({
  compraId,
  estadoActual,
}: {
  compraId: string
  estadoActual: EstadoCompra
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const transiciones = TRANSICIONES[estadoActual]

  async function handleCambiarEstado(nuevoEstado: string) {
    setLoading(true)
    try {
      await actualizarEstadoCompra(compraId, nuevoEstado as EstadoCompra)
      toast.success(`Estado actualizado a "${ESTADO_COMPRA_CONFIG[nuevoEstado as EstadoCompra].label}"`)
      router.refresh()
    } catch {
      toast.error("Error al actualizar estado")
    } finally {
      setLoading(false)
    }
  }

  async function handleRecibirTodo() {
    setLoading(true)
    try {
      await actualizarEstadoCompra(compraId, "recibida")
      toast.success("Compra marcada como recibida")
      router.refresh()
    } catch {
      toast.error("Error al marcar como recibida")
    } finally {
      setLoading(false)
    }
  }

  if (transiciones.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {(estadoActual === "confirmada" || estadoActual === "recibida_parcial") && (
        <Button
          variant="default"
          size="sm"
          onClick={handleRecibirTodo}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          )}
          Marcar todo recibido
        </Button>
      )}
      <Select onValueChange={(v: string | null) => v && handleCambiarEstado(v)} disabled={loading}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Cambiar estado" />
        </SelectTrigger>
        <SelectContent>
          {transiciones.map((estado) => (
            <SelectItem key={estado} value={estado}>
              {ESTADO_COMPRA_CONFIG[estado].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
