"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Truck,
  DollarSign,
  Pencil,
  MoreHorizontal,
  Trash2,
  Loader2,
  Info,
} from "lucide-react"
import {
  TIPO_INSUMO_CONFIG,
  UNIDAD_INSUMO_CONFIG,
  TIPO_MOVIMIENTO_CONFIG,
} from "@/lib/constants"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { AjusteStock } from "./ajuste-stock"
import type {
  TipoInsumo,
  UnidadInsumo,
  TipoMovimientoStock,
} from "@/types/database"

const PRESENTACION_OPTIONS = [
  "Unidad",
  "Rollo",
  "Caja",
  "Pack",
  "Bolsa",
  "Plancha",
] as const

export default function InsumoDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [insumo, setInsumo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Edit mode
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Form fields for edit mode
  const [formNombre, setFormNombre] = useState("")
  const [formTipo, setFormTipo] = useState<TipoInsumo>("material")
  const [formUnidad, setFormUnidad] = useState<UnidadInsumo>("unidades")
  const [formStockActual, setFormStockActual] = useState(0)
  const [formStockMinimo, setFormStockMinimo] = useState(0)
  const [formCosto, setFormCosto] = useState(0)
  const [formProveedorId, setFormProveedorId] = useState("")
  const [formPresentacion, setFormPresentacion] = useState("")
  const [formCantidadPresentacion, setFormCantidadPresentacion] = useState(0)
  const [formNotas, setFormNotas] = useState("")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proveedores, setProveedores] = useState<any[]>([])

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // ---------------------------------------------------------------------------
  // Fetch insumo
  // ---------------------------------------------------------------------------

  const fetchInsumo = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("insumos")
      .select(
        `
        *,
        proveedor:proveedores(id, nombre, telefono, email),
        producto:productos(id, nombre, sku),
        movimientos:movimientos_stock(
          id, tipo, cantidad, stock_anterior, stock_posterior,
          referencia_tipo, referencia_id, notas, created_at
        ),
        historial_costos:historial_costos_insumo(
          id, costo_anterior, costo_nuevo, motivo, created_at
        )
      `
      )
      .eq("id", id)
      .order("created_at", {
        referencedTable: "movimientos_stock",
        ascending: false,
      })
      .order("created_at", {
        referencedTable: "historial_costos_insumo",
        ascending: false,
      })
      .single()

    if (error) {
      toast.error("No se pudo cargar el insumo")
      router.push("/insumos")
      return
    }

    setInsumo(data)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    fetchInsumo()
  }, [fetchInsumo])

  useEffect(() => {
    supabase
      .from("proveedores")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setProveedores(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Populate form when entering edit mode
  // ---------------------------------------------------------------------------

  function enterEditMode() {
    if (!insumo) return
    setFormNombre(insumo.nombre)
    setFormTipo(insumo.tipo)
    setFormUnidad(insumo.unidad)
    setFormStockActual(Number(insumo.stock_actual))
    setFormStockMinimo(Number(insumo.stock_minimo))
    setFormCosto(Number(insumo.costo_unitario))
    setFormProveedorId(insumo.proveedor_id || "")
    setFormPresentacion(insumo.presentacion || "")
    setFormCantidadPresentacion(Number(insumo.cantidad_presentacion) || 0)
    setFormNotas(insumo.notas || "")
    setEditando(true)
  }

  function cancelEdit() {
    setEditando(false)
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleGuardar() {
    if (!insumo) return
    if (!formNombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setGuardando(true)
    try {
      const costoAnterior = Number(insumo.costo_unitario)
      const costoNuevo = formCosto

      // Update main record
      const { error } = await supabase
        .from("insumos")
        .update({
          nombre: formNombre.trim(),
          tipo: formTipo,
          unidad: formUnidad,
          stock_minimo: formStockMinimo,
          costo_unitario: costoNuevo,
          proveedor_id: formProveedorId || null,
          presentacion: formPresentacion || null,
          cantidad_presentacion: formCantidadPresentacion || null,
          notas: formNotas || null,
        })
        .eq("id", insumo.id)
      if (error) throw error

      // If cost changed, insert history record
      if (costoNuevo !== costoAnterior) {
        const { error: histErr } = await supabase
          .from("historial_costos_insumo")
          .insert({
            insumo_id: insumo.id,
            costo_anterior: costoAnterior,
            costo_nuevo: costoNuevo,
            motivo: "Edicion desde ficha de insumo",
          })
        if (histErr) throw histErr
      }

      toast.success("Insumo actualizado")
      setEditando(false)
      fetchInsumo()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleEliminar() {
    if (!insumo) return
    setEliminando(true)
    setDeleteError("")

    try {
      // Check if used in recipes
      const { data: recetaUso } = await supabase
        .from("receta_insumos")
        .select("id, receta:recetas(id, producto:productos(nombre))")
        .eq("insumo_id", insumo.id)
        .limit(10)

      if (recetaUso && recetaUso.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nombres = recetaUso.map((r: any) => r.receta?.producto?.nombre).filter(Boolean)
        setDeleteError(
          `Este insumo esta usado en recetas de: ${nombres.join(", ")}. Elimina la referencia primero.`
        )
        setEliminando(false)
        return
      }

      // Check if has movimientos
      const { count } = await supabase
        .from("movimientos_stock")
        .select("id", { count: "exact", head: true })
        .eq("insumo_id", insumo.id)

      if (count && count > 0) {
        // Deactivate instead of delete
        const { error } = await supabase
          .from("insumos")
          .update({ activo: false })
          .eq("id", insumo.id)
        if (error) throw error
        toast.success("Insumo desactivado (tiene historial de movimientos)")
      } else {
        // Safe to delete
        const { error } = await supabase
          .from("insumos")
          .delete()
          .eq("id", insumo.id)
        if (error) throw error
        toast.success("Insumo eliminado")
      }

      router.push("/insumos")
    } catch {
      toast.error("Error al eliminar el insumo")
    } finally {
      setEliminando(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading || !insumo) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const tipoConfig = TIPO_INSUMO_CONFIG[insumo.tipo as TipoInsumo]
  const unidadConfig = UNIDAD_INSUMO_CONFIG[insumo.unidad as UnidadInsumo]
  const bajoStock =
    insumo.tipo === "material" &&
    Number(insumo.stock_actual) < Number(insumo.stock_minimo) &&
    Number(insumo.stock_minimo) > 0

  const esMaterial = editando ? formTipo === "material" : insumo.tipo === "material"

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb-style back + name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/insumos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">
              <Link href="/insumos" className="hover:underline">
                Insumos
              </Link>{" "}
              / {insumo.nombre}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{insumo.nombre}</h1>
              <Badge variant="secondary" className={tipoConfig?.color}>
                {tipoConfig?.label}
              </Badge>
              {bajoStock && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" /> Stock bajo
                </Badge>
              )}
              {!insumo.activo && (
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-500"
                >
                  Inactivo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Guardar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon" className="h-8 w-8" />}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeleteError("")
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* EDIT MODE                                                         */}
      {/* ================================================================= */}
      {editando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Datos generales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formTipo}
                    onValueChange={(v: string | null) =>
                      v && setFormTipo(v as TipoInsumo)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_INSUMO_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <Select
                    value={formUnidad}
                    onValueChange={(v: string | null) =>
                      v && setFormUnidad(v as UnidadInsumo)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIDAD_INSUMO_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label} ({v.short})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock y costos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock y costos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!esMaterial && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  Los servicios no manejan stock fisico
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Stock actual</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formStockActual}
                    onChange={(e) =>
                      setFormStockActual(parseFloat(e.target.value) || 0)
                    }
                    disabled={!esMaterial}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock minimo</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formStockMinimo}
                    onChange={(e) =>
                      setFormStockMinimo(parseFloat(e.target.value) || 0)
                    }
                    disabled={!esMaterial}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Costo unitario ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formCosto}
                  onChange={(e) =>
                    setFormCosto(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Proveedor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formProveedorId || "ninguno"}
                onValueChange={(v: string | null) =>
                  setFormProveedorId(v === "ninguno" ? "" : v || "")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin proveedor</SelectItem>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {proveedores.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Compra / presentacion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Presentacion</Label>
                  <Select
                    value={formPresentacion || "ninguna"}
                    onValueChange={(v: string | null) =>
                      setFormPresentacion(v === "ninguna" ? "" : v || "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin presentacion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">Sin presentacion</SelectItem>
                      {PRESENTACION_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad por presentacion</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formCantidadPresentacion}
                    onChange={(e) =>
                      setFormCantidadPresentacion(
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas — full width */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formNotas}
                onChange={(e) => setFormNotas(e.target.value)}
                rows={3}
                placeholder="Notas internas sobre este insumo..."
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================================================================= */
        /* READ MODE                                                         */
        /* ================================================================= */
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {insumo.tipo === "material" ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    Stock actual
                  </div>
                  <p
                    className={`text-2xl font-bold ${bajoStock ? "text-amber-600" : ""}`}
                  >
                    {Number(insumo.stock_actual).toLocaleString("es-AR")}{" "}
                    {unidadConfig?.short}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Minimo:{" "}
                    {Number(insumo.stock_minimo).toLocaleString("es-AR")}{" "}
                    {unidadConfig?.short}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Info className="h-4 w-4" />
                    Tipo
                  </div>
                  <p className="text-lg font-bold">Servicio</p>
                  <p className="text-xs text-muted-foreground">
                    No maneja stock fisico
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Costo unitario
                </div>
                <p className="text-2xl font-bold">
                  ${Number(insumo.costo_unitario).toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  por {unidadConfig?.label?.toLowerCase()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Truck className="h-4 w-4" />
                  Proveedor
                </div>
                {insumo.proveedor ? (
                  <Link
                    href={`/proveedores/${insumo.proveedor.id}`}
                    className="text-lg font-bold hover:underline"
                  >
                    {insumo.proveedor.nombre}
                  </Link>
                ) : (
                  <p className="text-lg font-bold text-muted-foreground">
                    ---
                  </p>
                )}
              </CardContent>
            </Card>

            {(insumo.presentacion || insumo.unidad_compra) && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Presentacion
                  </p>
                  <p className="text-lg font-bold">
                    {insumo.presentacion || insumo.unidad_compra}
                  </p>
                  {insumo.cantidad_presentacion ? (
                    <p className="text-xs text-muted-foreground">
                      {Number(insumo.cantidad_presentacion).toLocaleString(
                        "es-AR"
                      )}{" "}
                      {unidadConfig?.short} c/u
                    </p>
                  ) : insumo.rendimiento && Number(insumo.rendimiento) > 1 ? (
                    <p className="text-xs text-muted-foreground">
                      Rinde{" "}
                      {Number(insumo.rendimiento).toLocaleString("es-AR")}{" "}
                      {unidadConfig?.short} c/u
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notas */}
          {insumo.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{insumo.notas}</p>
              </CardContent>
            </Card>
          )}

          {/* Ajuste stock (only materials) */}
          {insumo.tipo === "material" && (
            <AjusteStock
              insumoId={insumo.id}
              unidadShort={unidadConfig?.short || "u"}
            />
          )}

          {/* Historial de costos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de costos</CardTitle>
            </CardHeader>
            <CardContent>
              {insumo.historial_costos?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">
                        Costo anterior
                      </TableHead>
                      <TableHead className="text-right">Costo nuevo</TableHead>
                      <TableHead className="text-right">Variacion</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {insumo.historial_costos.map((h: any) => {
                      const anterior = Number(h.costo_anterior)
                      const nuevo = Number(h.costo_nuevo)
                      const variacion =
                        anterior > 0
                          ? ((nuevo - anterior) / anterior) * 100
                          : 0
                      const variacionColor =
                        variacion > 0
                          ? "text-red-600"
                          : variacion < 0
                            ? "text-green-600"
                            : "text-stone-500"
                      return (
                        <TableRow key={h.id}>
                          <TableCell className="tabular-nums">
                            {format(new Date(h.created_at), "dd/MM/yy HH:mm", {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            $
                            {anterior.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-medium">
                            $
                            {nuevo.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <Badge
                              variant="secondary"
                              className={
                                variacion > 0
                                  ? "bg-red-100 text-red-700"
                                  : variacion < 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-stone-100 text-stone-500"
                              }
                            >
                              <span className={variacionColor}>
                                {variacion > 0 ? "+" : ""}
                                {variacion.toFixed(1)}%
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {h.motivo || "---"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No hay cambios de costo registrados
                </p>
              )}
            </CardContent>
          </Card>

          {/* Movimientos de stock */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos de stock</CardTitle>
            </CardHeader>
            <CardContent>
              {insumo.movimientos?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Stock ant.</TableHead>
                      <TableHead className="text-right">Stock post.</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {insumo.movimientos.map((mov: any) => {
                      const movConfig =
                        TIPO_MOVIMIENTO_CONFIG[
                          mov.tipo as TipoMovimientoStock
                        ]
                      return (
                        <TableRow key={mov.id}>
                          <TableCell className="tabular-nums">
                            {format(
                              new Date(mov.created_at),
                              "dd/MM/yy HH:mm",
                              { locale: es }
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={movConfig?.color}
                            >
                              {movConfig?.sign} {movConfig?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {Number(mov.cantidad).toLocaleString("es-AR")}{" "}
                            {unidadConfig?.short}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {Number(mov.stock_anterior).toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(mov.stock_posterior).toLocaleString(
                              "es-AR"
                            )}
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {mov.referencia_tipo?.replace(/_/g, " ") || "---"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {mov.notas || "---"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No hay movimientos registrados
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ================================================================= */}
      {/* DELETE CONFIRMATION DIALOG                                         */}
      {/* ================================================================= */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar {insumo.nombre}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta accion no se puede deshacer. Si el insumo tiene historial de
            movimientos sera desactivado en lugar de eliminado.
          </p>
          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={eliminando || !!deleteError}
            >
              {eliminando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
