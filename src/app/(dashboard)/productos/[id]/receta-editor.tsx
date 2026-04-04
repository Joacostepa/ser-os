"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { crearReceta } from "@/lib/actions/recetas"
import { UNIDAD_INSUMO_CONFIG, TIPO_INSUMO_CONFIG } from "@/lib/constants"
import type { UnidadInsumo, TipoInsumo } from "@/types/database"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, Save, X } from "lucide-react"

interface RecetaItem {
  insumo_id: string
  insumo_nombre: string
  insumo_tipo: string
  insumo_unidad: string
  insumo_costo: number
  costo_override: number | null
  cantidad: number
}

function costoEfectivo(item: RecetaItem): number {
  return item.costo_override !== null ? item.costo_override : item.insumo_costo
}

function MargenBadge({ margenPct }: { margenPct: number }) {
  const badgeClass = margenPct >= 35
    ? "bg-green-100 text-green-700"
    : margenPct >= 20
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700"
  return <Badge variant="secondary" className={badgeClass}>{margenPct.toFixed(1)}%</Badge>
}

export function RecetaEditor({
  productoId,
  productoNombre,
  precioMayorista,
  recetaActual,
}: {
  productoId: string
  productoNombre: string
  precioMayorista?: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recetaActual: any | null
}) {
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState(recetaActual?.nombre || `Receta ${productoNombre}`)
  const [items, setItems] = useState<RecetaItem[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [insumos, setInsumos] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from("insumos").select("id, nombre, tipo, unidad, costo_unitario").eq("activo", true).order("nombre")
      .then(({ data }) => setInsumos(data || []))
  }, [])

  useEffect(() => {
    if (recetaActual?.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems(recetaActual.items.map((item: any) => ({
        insumo_id: item.insumo?.id || item.insumo_id,
        insumo_nombre: item.insumo?.nombre || "",
        insumo_tipo: item.insumo?.tipo || "material",
        insumo_unidad: item.insumo?.unidad || "unidades",
        insumo_costo: Number(item.insumo?.costo_unitario || 0),
        costo_override: item.costo_override != null ? Number(item.costo_override) : null,
        cantidad: Number(item.cantidad),
      })))
    }
  }, [recetaActual])

  function addItem() {
    setItems([...items, {
      insumo_id: "", insumo_nombre: "", insumo_tipo: "material",
      insumo_unidad: "unidades", insumo_costo: 0, costo_override: null, cantidad: 1,
    }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function selectInsumo(index: number, insumoId: string) {
    const insumo = insumos.find((i) => i.id === insumoId)
    if (!insumo) return
    setItems((prev) => prev.map((item, i) =>
      i === index ? {
        ...item,
        insumo_id: insumo.id,
        insumo_nombre: insumo.nombre,
        insumo_tipo: insumo.tipo,
        insumo_unidad: insumo.unidad,
        insumo_costo: Number(insumo.costo_unitario),
        costo_override: null,
      } : item
    ))
  }

  async function handleSave() {
    if (items.length === 0) { toast.error("Agregá al menos un insumo"); return }
    if (items.some((i) => !i.insumo_id)) { toast.error("Seleccioná un insumo en cada línea"); return }

    setSubmitting(true)
    try {
      await crearReceta({
        producto_id: productoId,
        nombre,
        items: items.map((i) => ({
          insumo_id: i.insumo_id,
          cantidad: i.cantidad,
          costo_override: i.costo_override !== null && i.costo_override !== i.insumo_costo ? i.costo_override : null,
        })),
      })
      toast.success("Receta guardada")
      setEditing(false)
      router.refresh()
    } catch {
      toast.error("Error al guardar receta")
    } finally {
      setSubmitting(false)
    }
  }

  const costoTotal = items.reduce((sum, i) => sum + (i.cantidad * costoEfectivo(i)), 0)
  const precio = Number(precioMayorista || 0)
  const margen = precio - costoTotal
  const margenPct = precio > 0 ? (margen / precio) * 100 : 0

  // View mode
  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Receta (BOM) {recetaActual ? `— ${recetaActual.nombre}` : ""}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { setEditing(true); if (!recetaActual) addItem() }}>
              <Pencil className="h-3 w-3 mr-1" />
              {recetaActual ? "Editar" : "Crear receta"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recetaActual?.items?.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {recetaActual.items.map((item: any) => {
                    const unidad = UNIDAD_INSUMO_CONFIG[item.insumo?.unidad as UnidadInsumo]
                    const tipoConf = TIPO_INSUMO_CONFIG[item.insumo?.tipo as TipoInsumo]
                    const costo = Number(item.costo_override ?? item.insumo?.costo_unitario ?? 0)
                    const subtotal = Number(item.cantidad) * costo
                    const esOverride = item.costo_override != null
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.insumo?.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={tipoConf?.color}>{tipoConf?.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {Number(item.cantidad).toLocaleString("es-AR")} {unidad?.short}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          ${costo.toLocaleString("es-AR")}
                          {esOverride && <span className="text-[10px] text-amber-600 ml-1">*</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-medium">
                          ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Costeo footer */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-stone-500">Costo unitario</p>
                    <p className="text-lg font-mono font-medium text-stone-900">
                      ${costoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Precio de venta</p>
                    <p className="text-lg font-mono font-medium text-stone-900">
                      {precio > 0 ? `$${precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Margen bruto</p>
                    {precio > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-medium text-stone-900">
                          ${margen.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                        <MargenBadge margenPct={margenPct} />
                      </div>
                    ) : (
                      <p className="text-lg font-mono font-medium text-stone-400">—</p>
                    )}
                  </div>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {recetaActual?.items?.some((item: any) => {
                  const c = Number(item.costo_override ?? item.insumo?.costo_unitario ?? 0)
                  return c === 0
                }) && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2">
                    <p className="text-sm text-amber-800">
                      Algunos insumos tienen costo $0. El costeo puede no ser exacto.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-stone-400 py-4">
              No hay receta definida. Creá una para calcular costos automáticamente.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Edit mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Editar receta</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={submitting}>
              <Save className="h-3 w-3 mr-1" /> {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre de la receta</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Insumos</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </div>

          {/* Header */}
          <div className="flex gap-2 text-[10px] text-stone-400 uppercase tracking-wide px-1">
            <span className="flex-1">Insumo</span>
            <span className="w-20 text-right">Cantidad</span>
            <span className="w-24 text-right">Costo unit.</span>
            <span className="w-24 text-right">Subtotal</span>
            <span className="w-9" />
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const unidad = UNIDAD_INSUMO_CONFIG[item.insumo_unidad as UnidadInsumo]
              const costo = costoEfectivo(item)
              const subtotal = item.cantidad * costo
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select value={item.insumo_id} onValueChange={(v: string | null) => v && selectInsumo(idx, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar insumo...">
                          {item.insumo_nombre
                            ? `${item.insumo_nombre} (${unidad?.short || item.insumo_unidad})`
                            : "Seleccionar insumo..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {insumos.map((ins: any) => (
                          <SelectItem key={ins.id} value={ins.id}>
                            {ins.nombre} ({UNIDAD_INSUMO_CONFIG[ins.unidad as UnidadInsumo]?.short})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number" min={0} step={0.01}
                      value={item.cantidad}
                      onChange={(e) => setItems((prev) => prev.map((it, i) =>
                        i === idx ? { ...it, cantidad: parseFloat(e.target.value) || 0 } : it
                      ))}
                      className="font-mono text-right"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number" min={0} step={0.01}
                      value={item.costo_override !== null ? item.costo_override : item.insumo_costo}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setItems((prev) => prev.map((it, i) =>
                          i === idx ? { ...it, costo_override: val } : it
                        ))
                      }}
                      className="font-mono text-right"
                    />
                  </div>
                  <span className="w-24 text-sm font-mono font-medium text-stone-700 text-right tabular-nums">
                    ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="shrink-0 w-9">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="pt-3 border-t space-y-2">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-stone-500">Costo unitario</p>
              <p className="text-lg font-mono font-medium text-stone-900">
                ${costoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Precio de venta</p>
              <p className="text-lg font-mono font-medium text-stone-900">
                {precio > 0 ? `$${precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Margen bruto</p>
              {precio > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-medium text-stone-900">
                    ${margen.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                  <MargenBadge margenPct={margenPct} />
                </div>
              ) : (
                <p className="text-lg font-mono font-medium text-stone-400">—</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
