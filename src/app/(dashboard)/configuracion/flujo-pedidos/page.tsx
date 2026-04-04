"use client"

import { useEffect, useState, useCallback } from "react"
import { getConfigEtapas, getKanbanColumnas } from "@/lib/config/etapas"
import { guardarConfigEtapas, guardarKanbanColumnas } from "@/lib/actions/config-flujo"
import {
  TIPO_PEDIDO_OPTIONS,
  ESTADOS_OBLIGATORIOS,
  ESTADOS_SISTEMA,
  KANBAN_COLUMN_COLORS,
  type ConfigEtapa,
  type ConfigKanbanColumna,
} from "@/lib/config/tipos"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Save, Plus, X, Trash2, GripVertical } from "lucide-react"

// ── Helpers ────────────────────────────────────────────────────────────

function isObligatorio(estado: string) {
  return (ESTADOS_OBLIGATORIOS as readonly string[]).includes(estado)
}

function isSistema(estado: string) {
  return (ESTADOS_SISTEMA as readonly string[]).includes(estado)
}

type TipoKey = "activo_logo_ser" | "activo_marca_blanca" | "activo_personalizado"

const TIPO_FIELD_MAP: Record<string, TipoKey> = {
  logo_ser: "activo_logo_ser",
  marca_blanca: "activo_marca_blanca",
  personalizado: "activo_personalizado",
}

// ── Page ───────────────────────────────────────────────────────────────

export default function FlujoPedidosPage() {
  const [etapas, setEtapas] = useState<ConfigEtapa[]>([])
  const [columnas, setColumnas] = useState<ConfigKanbanColumna[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [e, c] = await Promise.all([getConfigEtapas(), getKanbanColumnas()])
        setEtapas(e)
        setColumnas(c)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar configuración")
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Etapas handlers ──────────────────────────────────────────────

  const handleToggleTipo = useCallback(
    (etapaId: number, tipoKey: TipoKey, checked: boolean) => {
      setEtapas((prev) =>
        prev.map((e) => (e.id === etapaId ? { ...e, [tipoKey]: checked } : e)),
      )
    },
    [],
  )

  const handleLabelChange = useCallback((etapaId: number, value: string) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, label_custom: value || null } : e)),
    )
  }, [])

  // ── Portal handlers ──────────────────────────────────────────────

  const handlePortalVisible = useCallback((etapaId: number, checked: boolean) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, visible_en_portal: checked } : e)),
    )
  }, [])

  const handlePortalLabel = useCallback((etapaId: number, value: string) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, label_portal: value || null } : e)),
    )
  }, [])

  // ── Kanban handlers ──────────────────────────────────────────────

  const handleColumnNameChange = useCallback((colId: number, nombre: string) => {
    setColumnas((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, nombre } : c)),
    )
  }, [])

  const handleColumnColorChange = useCallback((colId: number, color: string) => {
    setColumnas((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, color } : c)),
    )
  }, [])

  const handleRemoveEstadoFromColumn = useCallback((colId: number, estado: string) => {
    setColumnas((prev) =>
      prev.map((c) =>
        c.id === colId ? { ...c, estados: c.estados.filter((e) => e !== estado) } : c,
      ),
    )
  }, [])

  const handleAddEstadoToColumn = useCallback(
    (colId: number, estado: string) => {
      setColumnas((prev) =>
        prev.map((c) =>
          c.id === colId ? { ...c, estados: [...c.estados, estado] } : c,
        ),
      )
    },
    [],
  )

  const handleAddColumn = useCallback(() => {
    const maxId = columnas.reduce((max, c) => Math.max(max, c.id), 0)
    setColumnas((prev) => [
      ...prev,
      {
        id: maxId + 1,
        nombre: "Nueva columna",
        orden: prev.length,
        color: "#a8a29e",
        icono: null,
        estados: [],
        colapsada: false,
      },
    ])
  }, [columnas])

  const handleRemoveColumn = useCallback((colId: number) => {
    setColumnas((prev) => prev.filter((c) => c.id !== colId))
  }, [])

  // ── Save ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate: all etapas must be assigned to at least one column
      const assignedEstados = columnas.flatMap((c) => c.estados)
      const etapasConfigurables = etapas.filter((e) => !isSistema(e.estado_interno))
      const unassigned = etapasConfigurables.filter(
        (e) => !assignedEstados.includes(e.estado_interno),
      )
      if (unassigned.length > 0) {
        setError(
          `Hay etapas sin asignar a columnas del kanban: ${unassigned.map((e) => e.label_custom || e.label_default).join(", ")}`,
        )
        setSaving(false)
        return
      }

      await Promise.all([guardarConfigEtapas(etapas), guardarKanbanColumnas(columnas)])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    }
    setSaving(false)
  }, [etapas, columnas])

  // ── Unassigned estados (for adding to columns) ──────────────────

  const assignedEstados = columnas.flatMap((c) => c.estados)
  const allConfigurableEstados = etapas
    .filter((e) => !isSistema(e.estado_interno))
    .map((e) => e.estado_interno)
  const unassignedEstados = allConfigurableEstados.filter(
    (e) => !assignedEstados.includes(e),
  )

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Flujo de pedidos</h1>
          <p className="text-sm text-stone-400">Configurar etapas, kanban y portal</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const etapasConfigurables = etapas.filter((e) => !isSistema(e.estado_interno))

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Flujo de pedidos</h1>
        <p className="text-sm text-stone-400">Configurar etapas, kanban y portal del cliente</p>
      </div>

      {/* ── Section 1: Etapas por tipo ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Etapas por tipo de pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logo_ser">
            <TabsList variant="line">
              {TIPO_PEDIDO_OPTIONS.filter((o) => o.value !== "sin_clasificar").map(
                (opt) => (
                  <TabsTrigger key={opt.value} value={opt.value}>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${opt.bg} ${opt.text}`}>
                      {opt.label}
                    </span>
                  </TabsTrigger>
                ),
              )}
            </TabsList>

            {TIPO_PEDIDO_OPTIONS.filter((o) => o.value !== "sin_clasificar").map(
              (opt) => {
                const tipoKey = TIPO_FIELD_MAP[opt.value]
                return (
                  <TabsContent key={opt.value} value={opt.value}>
                    <div className="mt-4 space-y-1">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_200px_40px] items-center gap-4 px-3 py-2 text-xs font-medium text-stone-400 uppercase tracking-wide">
                        <span>Etapa</span>
                        <span>Label personalizado</span>
                        <span className="text-center">Activa</span>
                      </div>

                      {etapasConfigurables.map((etapa) => {
                        const obligatorio = isObligatorio(etapa.estado_interno)
                        const activo = etapa[tipoKey]

                        return (
                          <div
                            key={etapa.id}
                            className="grid grid-cols-[1fr_200px_40px] items-center gap-4 px-3 py-2 rounded-lg hover:bg-stone-50"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md ${etapa.badge_color_bg} ${etapa.badge_color_text}`}>
                                {etapa.label_custom || etapa.label_default}
                              </span>
                              {obligatorio && (
                                <span className="text-[10px] text-stone-400">obligatoria</span>
                              )}
                            </div>
                            <Input
                              value={etapa.label_custom || ""}
                              onChange={(e) => handleLabelChange(etapa.id, e.target.value)}
                              placeholder={etapa.label_default}
                              className="h-7 text-sm"
                            />
                            <div className="flex justify-center">
                              <Checkbox
                                checked={activo}
                                onCheckedChange={(checked) =>
                                  handleToggleTipo(etapa.id, tipoKey, !!checked)
                                }
                                disabled={obligatorio}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>
                )
              },
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Section 2: Columnas del Kanban ─────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Columnas del Kanban</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddColumn}>
              <Plus className="h-3.5 w-3.5" />
              Agregar columna
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {columnas.map((col) => (
            <div
              key={col.id}
              className="border border-stone-200 rounded-lg p-4 space-y-3"
            >
              {/* Column name + color + delete */}
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-stone-300 shrink-0" />
                <Input
                  value={col.nombre}
                  onChange={(e) => handleColumnNameChange(col.id, e.target.value)}
                  className="h-7 text-sm max-w-[200px]"
                  placeholder="Nombre de columna"
                />
                <div className="flex items-center gap-1.5">
                  {KANBAN_COLUMN_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className={`h-5 w-5 rounded-full transition-all ${
                        col.color === c.value
                          ? "ring-2 ring-offset-1 ring-stone-400 scale-110"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => handleColumnColorChange(col.id, c.value)}
                    />
                  ))}
                </div>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemoveColumn(col.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                </Button>
              </div>

              {/* Estados chips */}
              <div className="flex flex-wrap gap-1.5">
                {col.estados.map((estado) => {
                  const etapa = etapas.find((e) => e.estado_interno === estado)
                  return (
                    <span
                      key={estado}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                        etapa ? `${etapa.badge_color_bg} ${etapa.badge_color_text}` : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {etapa?.label_custom || etapa?.label_default || estado}
                      <button
                        type="button"
                        onClick={() => handleRemoveEstadoFromColumn(col.id, estado)}
                        className="ml-0.5 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}

                {/* Add estado button */}
                {unassignedEstados.length > 0 && (
                  <div className="relative group">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-stone-50 text-stone-400 border border-dashed border-stone-300 hover:bg-stone-100"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar
                    </button>
                    <div className="absolute top-full left-0 mt-1 z-10 hidden group-hover:block bg-white border border-stone-200 rounded-lg shadow-lg p-1 min-w-[180px]">
                      {unassignedEstados.map((estado) => {
                        const etapa = etapas.find(
                          (e) => e.estado_interno === estado,
                        )
                        return (
                          <button
                            key={estado}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-stone-50"
                            onClick={() => handleAddEstadoToColumn(col.id, estado)}
                          >
                            {etapa?.label_custom || etapa?.label_default || estado}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {columnas.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6">
              No hay columnas configuradas. Agregá una para empezar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3: Portal del cliente ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_200px_60px] items-center gap-4 px-3 py-2 text-xs font-medium text-stone-400 uppercase tracking-wide">
              <span>Etapa</span>
              <span>Label en portal</span>
              <span className="text-center">Visible</span>
            </div>

            {etapas.map((etapa) => {
              const sistema = isSistema(etapa.estado_interno)
              return (
                <div
                  key={etapa.id}
                  className="grid grid-cols-[1fr_200px_60px] items-center gap-4 px-3 py-2 rounded-lg hover:bg-stone-50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md ${etapa.badge_color_bg} ${etapa.badge_color_text}`}>
                      {etapa.label_custom || etapa.label_default}
                    </span>
                    {sistema && (
                      <span className="text-[10px] text-stone-400">sistema</span>
                    )}
                  </div>
                  <Input
                    value={etapa.label_portal || ""}
                    onChange={(e) => handlePortalLabel(etapa.id, e.target.value)}
                    placeholder={etapa.label_custom || etapa.label_default}
                    className="h-7 text-sm"
                    disabled={sistema}
                  />
                  <div className="flex justify-center">
                    <Checkbox
                      checked={etapa.visible_en_portal}
                      onCheckedChange={(checked) =>
                        handlePortalVisible(etapa.id, !!checked)
                      }
                      disabled={sistema}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Save button ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 flex items-center justify-between z-40">
        <div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Configuración guardada</p>}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  )
}
