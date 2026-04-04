"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ajustarStock } from "@/lib/actions/movimientos"
import type { TipoMovimientoStock } from "@/types/database"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function AjusteStock({
  insumoId,
  unidadShort,
}: {
  insumoId: string
  unidadShort: string
}) {
  const [tipo, setTipo] = useState<TipoMovimientoStock>("entrada")
  const [cantidad, setCantidad] = useState(0)
  const [notas, setNotas] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cantidad <= 0) { toast.error("La cantidad debe ser mayor a 0"); return }

    setLoading(true)
    try {
      await ajustarStock({
        insumo_id: insumoId,
        tipo,
        cantidad,
        notas: notas || undefined,
      })
      toast.success("Stock actualizado")
      setCantidad(0)
      setNotas("")
      router.refresh()
    } catch {
      toast.error("Error al ajustar stock")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajuste manual de stock</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v: string | null) => v && setTipo(v as TipoMovimientoStock)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">+ Entrada</SelectItem>
                <SelectItem value="salida">- Salida</SelectItem>
                <SelectItem value="ajuste">~ Ajuste</SelectItem>
                <SelectItem value="devolucion">+ Devolución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad ({unidadShort})</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={cantidad}
              onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
              className="w-[120px]"
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={1} className="min-h-[36px]" />
          </div>
          <Button type="submit" disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
