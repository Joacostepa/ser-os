"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Check, X, AlertTriangle } from "lucide-react"
import { actualizarCostoBase } from "@/lib/actions/productos"
import { toast } from "sonner"

export function CostoCard({
  productoId,
  costoBase,
  costoReceta,
  tieneReceta,
  precioMayorista,
  precioNeto,
}: {
  productoId: string
  costoBase: number | null
  costoReceta: number
  tieneReceta: boolean
  precioMayorista: number | null
  precioNeto: number | null
}) {
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState(costoBase || 0)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const costoEfectivo = tieneReceta ? costoReceta : (costoBase || 0)
  const fuente = tieneReceta ? "receta" : costoBase ? "compra" : null
  const neto = Number(precioNeto || 0)
  const precio = Number(precioMayorista || 0)
  const margen = neto > 0 ? neto - costoEfectivo : precio - costoEfectivo
  const margenPct = neto > 0 ? (margen / neto) * 100 : precio > 0 ? (margen / precio) * 100 : 0

  async function handleSave() {
    setSaving(true)
    try {
      await actualizarCostoBase(productoId, valor)
      toast.success("Costo base actualizado")
      setEditing(false)
      router.refresh()
    } catch {
      toast.error("Error al actualizar")
    } finally {
      setSaving(false)
    }
  }

  const label = tieneReceta ? "Costo (receta)" : costoBase ? "Costo (compra)" : "Costo base"

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-stone-500">{label}</p>
          {!tieneReceta && !editing && (
            <button onClick={() => { setEditing(true); setValor(costoBase || 0) }} className="text-stone-400 hover:text-stone-600 transition-colors">
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-stone-500">$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={valor}
              onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
              className="font-mono w-32"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={saving} className="h-8 w-8">
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {costoEfectivo > 0 ? (
              <p className="text-2xl font-mono font-medium text-stone-900">
                ${costoEfectivo.toLocaleString("es-AR")}
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                <p className="text-sm text-amber-600">Sin definir</p>
              </div>
            )}
          </>
        )}

        {/* Margin display */}
        {costoEfectivo > 0 && (neto > 0 || precio > 0) && !editing && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-stone-500">Margen s/IVA:</span>
            <span className="text-xs font-mono text-stone-700">
              ${margen.toLocaleString("es-AR")}
            </span>
            <Badge variant="secondary" className={
              margenPct >= 35 ? "bg-green-100 text-green-700"
              : margenPct >= 20 ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
            }>
              {margenPct.toFixed(1)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
