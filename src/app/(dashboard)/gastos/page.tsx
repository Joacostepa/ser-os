"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Check, Search, Repeat } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/shared/data-table"
import { MetricCard } from "@/components/reportes/kpi-card"
import { PeriodSelector, getPeriodDates, type Period } from "@/components/reportes/period-selector"
import {
  getGastos,
  crearGasto,
  marcarGastoPagado,
  getCategoriaGastos,
  getGastosMetrics,
} from "@/lib/actions/finanzas"
import {
  METODOS_PAGO,
  CATEGORIA_IVA_DEFAULT,
  CONDICION_FISCAL_CONFIG,
  FRECUENCIA_OPTIONS,
} from "@/lib/constants"
import { descomponerIVA } from "@/lib/iva"
import { formatearMonto, formatearMontoCompleto } from "@/lib/formatters"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gasto = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Proveedor = { id: string; nombre: string; condicion_fiscal: string }

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categorias, setCategorias] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Metrics
  const [metrics, setMetrics] = useState<{
    gastosDelPeriodo: number
    ivaRecuperable: number
    gastosPendientes: number
    recurrentesActivos: number
  } | null>(null)

  // Filters
  const [filtroBusqueda, setFiltroBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("todas")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [period, setPeriod] = useState<Period>("ultimos_30")

  // New gasto form
  const [formDescripcion, setFormDescripcion] = useState("")
  const [formCategoriaId, setFormCategoriaId] = useState("")
  const [formMonto, setFormMonto] = useState("")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formPagado, setFormPagado] = useState(false)
  const [formMetodo, setFormMetodo] = useState("")
  const [formObservaciones, setFormObservaciones] = useState("")
  const [formIncluyeIva, setFormIncluyeIva] = useState(false)
  const [formProveedorId, setFormProveedorId] = useState("")
  const [formRecurrente, setFormRecurrente] = useState(false)
  const [formFrecuencia, setFormFrecuencia] = useState("")

  // Marcar pagado dialog
  const [pagarDialogOpen, setPagarDialogOpen] = useState(false)
  const [pagarGastoId, setPagarGastoId] = useState("")
  const [pagarMetodo, setPagarMetodo] = useState("")

  // Fetch proveedores on mount
  useEffect(() => {
    async function fetchProveedores() {
      const supabase = createClient()
      const { data } = await supabase
        .from("proveedores")
        .select("id, nombre, condicion_fiscal")
        .eq("activo", true)
        .order("nombre")
      setProveedores(data || [])
    }
    fetchProveedores()
  }, [])

  // IVA desglose
  const ivaDesglose = useMemo(() => {
    const monto = parseFloat(formMonto)
    if (!formIncluyeIva || isNaN(monto) || monto <= 0) return null
    return descomponerIVA(monto)
  }, [formMonto, formIncluyeIva])

  // Auto-suggest IVA based on category
  useEffect(() => {
    if (!formCategoriaId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = categorias.find((c: any) => c.id === Number(formCategoriaId))
    if (cat && CATEGORIA_IVA_DEFAULT[cat.codigo] !== undefined) {
      setFormIncluyeIva(CATEGORIA_IVA_DEFAULT[cat.codigo])
    }
  }, [formCategoriaId, categorias])

  // Auto-configure IVA based on proveedor condicion_fiscal
  useEffect(() => {
    if (!formProveedorId || formProveedorId === "none") return
    const prov = proveedores.find((p) => p.id === formProveedorId)
    if (!prov) return
    if (prov.condicion_fiscal === "responsable_inscripto") {
      setFormIncluyeIva(true)
    } else if (prov.condicion_fiscal === "monotributista" || prov.condicion_fiscal === "exento") {
      setFormIncluyeIva(false)
    }
  }, [formProveedorId, proveedores])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { desde, hasta } = getPeriodDates(period)
        const desdeDate = desde.split("T")[0]
        const hastaDate = hasta.split("T")[0]

        const [gastosData, categoriasData, metricsData] = await Promise.all([
          getGastos({
            pagado: filtroEstado !== "todos" ? filtroEstado : undefined,
            desde: desdeDate,
            hasta: hastaDate,
          }),
          getCategoriaGastos(),
          getGastosMetrics(desdeDate, hastaDate),
        ])
        setCategorias(categoriasData)
        setMetrics(metricsData)

        let filtered = gastosData || []
        if (filtroCategoria !== "todas") {
          filtered = filtered.filter((g: Gasto) => g.cuenta?.id === Number(filtroCategoria))
        }
        setGastos(filtered)
      } catch {
        setGastos([])
        setMetrics(null)
      }
      setLoading(false)
    }
    fetchData()
  }, [filtroCategoria, filtroEstado, period])

  // Client-side search filter
  const filteredGastos = useMemo(() => {
    if (!filtroBusqueda.trim()) return gastos
    const q = filtroBusqueda.toLowerCase()
    return gastos.filter(
      (g: Gasto) =>
        g.descripcion?.toLowerCase().includes(q) ||
        g.cuenta?.nombre?.toLowerCase().includes(q) ||
        g.proveedor?.nombre?.toLowerCase().includes(q)
    )
  }, [gastos, filtroBusqueda])

  async function handleCrearGasto(e: React.FormEvent) {
    e.preventDefault()
    if (!formDescripcion || !formCategoriaId || !formMonto) {
      toast.error("Completa los campos requeridos")
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = categorias.find((c: any) => c.id === Number(formCategoriaId))
    if (!cat) return

    setSubmitting(true)
    try {
      await crearGasto({
        descripcion: formDescripcion,
        cuenta_id: Number(formCategoriaId),
        cuenta_codigo: cat.codigo,
        monto: parseFloat(formMonto),
        fecha: formFecha,
        pagado: formPagado,
        metodo_pago: formPagado ? formMetodo || undefined : undefined,
        observaciones: formObservaciones || undefined,
        incluye_iva: formIncluyeIva,
        proveedor_id: formProveedorId && formProveedorId !== "none" ? formProveedorId : undefined,
        recurrente: formRecurrente,
        frecuencia: formRecurrente ? formFrecuencia || undefined : undefined,
      })
      toast.success("Gasto registrado")
      setDialogOpen(false)
      resetForm()
      // Re-fetch
      const { desde, hasta } = getPeriodDates(period)
      const desdeDate = desde.split("T")[0]
      const hastaDate = hasta.split("T")[0]
      const [data, metricsData] = await Promise.all([
        getGastos({
          pagado: filtroEstado !== "todos" ? filtroEstado : undefined,
          desde: desdeDate,
          hasta: hastaDate,
        }),
        getGastosMetrics(desdeDate, hastaDate),
      ])
      setGastos(data || [])
      setMetrics(metricsData)
    } catch {
      toast.error("Error al registrar el gasto")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarcarPagado() {
    if (!pagarGastoId || !pagarMetodo) {
      toast.error("Selecciona un metodo de pago")
      return
    }
    setSubmitting(true)
    try {
      await marcarGastoPagado(pagarGastoId, pagarMetodo)
      toast.success("Gasto marcado como pagado")
      setPagarDialogOpen(false)
      setPagarGastoId("")
      setPagarMetodo("")
      // Re-fetch
      const { desde, hasta } = getPeriodDates(period)
      const desdeDate = desde.split("T")[0]
      const hastaDate = hasta.split("T")[0]
      const [data, metricsData] = await Promise.all([
        getGastos({
          pagado: filtroEstado !== "todos" ? filtroEstado : undefined,
          desde: desdeDate,
          hasta: hastaDate,
        }),
        getGastosMetrics(desdeDate, hastaDate),
      ])
      setGastos(data || [])
      setMetrics(metricsData)
    } catch {
      toast.error("Error al marcar como pagado")
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormDescripcion("")
    setFormCategoriaId("")
    setFormMonto("")
    setFormFecha(new Date().toISOString().split("T")[0])
    setFormPagado(false)
    setFormMetodo("")
    setFormObservaciones("")
    setFormIncluyeIva(false)
    setFormProveedorId("")
    setFormRecurrente(false)
    setFormFrecuencia("")
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-stone-600">{formatFecha(row.original.fecha)}</span>
      ),
    },
    {
      accessorKey: "descripcion",
      header: "Descripcion",
      cell: ({ row }) => (
        <span className="text-stone-800">{row.original.descripcion}</span>
      ),
    },
    {
      accessorKey: "cuenta",
      header: "Categoria",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {row.original.cuenta?.nombre || "\u2014"}
        </Badge>
      ),
    },
    {
      accessorKey: "proveedor",
      header: "Proveedor",
      cell: ({ row }) => (
        <span className="text-stone-600 text-sm">
          {row.original.proveedor?.nombre || "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "monto",
      header: "Monto",
      cell: ({ row }) => (
        <span className="font-mono text-stone-800">
          {formatearMontoCompleto(Number(row.original.monto))}
        </span>
      ),
    },
    {
      id: "iva",
      header: "IVA",
      cell: ({ row }) =>
        row.original.incluye_iva ? (
          <Badge className="bg-blue-50 text-blue-700 text-xs">IVA</Badge>
        ) : null,
    },
    {
      id: "recurrente",
      header: "",
      cell: ({ row }) =>
        row.original.recurrente ? (
          <Repeat className="h-3.5 w-3.5 text-stone-400" />
        ) : null,
    },
    {
      accessorKey: "pagado",
      header: "Estado",
      cell: ({ row }) =>
        row.original.pagado ? (
          <Badge className="bg-green-50 text-green-700 text-xs">Pagado</Badge>
        ) : (
          <Badge className="bg-amber-50 text-amber-700 text-xs">Pendiente</Badge>
        ),
    },
    {
      accessorKey: "monto_usd",
      header: "USD",
      cell: ({ row }) => {
        const usd = row.original.monto_usd
        if (!usd) return <span className="text-stone-300">—</span>
        return (
          <span className="text-green-700 text-sm font-mono text-right block">
            US${Number(usd).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </span>
        )
      },
    },
    {
      accessorKey: "metodo_pago",
      header: "Metodo",
      cell: ({ row }) => (
        <span className="text-stone-500 text-xs">
          {row.original.metodo_pago || "\u2014"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) =>
        !row.original.pagado ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPagarGastoId(row.original.id)
              setPagarDialogOpen(true)
            }}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Pagar
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Gastos</h1>
          <p className="text-sm text-stone-400">
            Registro y seguimiento de gastos operativos
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Gastos del periodo"
            value={formatearMonto(metrics.gastosDelPeriodo)}
          />
          <MetricCard
            label="IVA recuperable"
            value={formatearMonto(metrics.ivaRecuperable)}
            valueColor={metrics.ivaRecuperable > 0 ? "text-blue-700" : "text-stone-900"}
          />
          <MetricCard
            label="Gastos pendientes"
            value={formatearMonto(metrics.gastosPendientes)}
            valueColor={metrics.gastosPendientes > 0 ? "text-amber-600" : "text-stone-900"}
          />
          <MetricCard
            label="Recurrentes activos"
            value={String(metrics.recurrentesActivos)}
          />
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            placeholder="Buscar gastos..."
            className="pl-9 w-[200px]"
          />
        </div>

        <Select
          value={filtroCategoria}
          onValueChange={(v: string | null) => v && setFiltroCategoria(v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorias</SelectItem>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {categorias.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtroEstado}
          onValueChange={(v: string | null) => v && setFiltroEstado(v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo gasto
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo gasto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrearGasto} className="space-y-4">
              {/* Descripcion */}
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Input
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Envio MercadoEnvios"
                  required
                />
              </div>

              {/* Categoria + Monto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formCategoriaId}
                    onValueChange={(v: string | null) => v && setFormCategoriaId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {categorias.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* IVA Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formIncluyeIva}
                  onCheckedChange={(c) => setFormIncluyeIva(!!c)}
                />
                <Label className="text-sm text-stone-600">Incluye IVA 21%</Label>
              </div>

              {/* IVA Desglose */}
              {formIncluyeIva && ivaDesglose && (
                <div className="bg-stone-50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Neto</span>
                    <span className="font-mono text-stone-700">
                      {formatearMontoCompleto(ivaDesglose.neto)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">IVA 21%</span>
                    <span className="font-mono text-blue-700">
                      {formatearMontoCompleto(ivaDesglose.iva)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-stone-200 pt-1">
                    <span className="text-stone-700">Total</span>
                    <span className="font-mono text-stone-900">
                      {formatearMontoCompleto(ivaDesglose.total)}
                    </span>
                  </div>
                </div>
              )}

              {/* Fecha + Metodo de pago */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Metodo de pago</Label>
                  <Select
                    value={formMetodo}
                    onValueChange={(v: string | null) => v && setFormMetodo(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Proveedor */}
              <div className="space-y-2">
                <Label>Proveedor (opcional)</Label>
                <Select
                  value={formProveedorId}
                  onValueChange={(v: string | null) => v && setFormProveedorId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proveedor</SelectItem>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                        {p.condicion_fiscal && CONDICION_FISCAL_CONFIG[p.condicion_fiscal as keyof typeof CONDICION_FISCAL_CONFIG]
                          ? ` (${CONDICION_FISCAL_CONFIG[p.condicion_fiscal as keyof typeof CONDICION_FISCAL_CONFIG].short})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recurrente */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formRecurrente}
                    onCheckedChange={(c) => setFormRecurrente(!!c)}
                  />
                  <Label className="text-sm text-stone-600">Gasto recurrente</Label>
                </div>
                {formRecurrente && (
                  <Select
                    value={formFrecuencia}
                    onValueChange={(v: string | null) => v && setFormFrecuencia(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {FRECUENCIA_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Ya esta pagado */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formPagado}
                  onCheckedChange={(c) => setFormPagado(!!c)}
                />
                <Label className="text-sm text-stone-600">Ya esta pagado</Label>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Guardando..." : "Guardar gasto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredGastos.length > 0 ? (
        <DataTable columns={columns} data={filteredGastos} />
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">
          No hay gastos registrados
        </p>
      )}

      {/* Dialog marcar como pagado */}
      <Dialog open={pagarDialogOpen} onOpenChange={setPagarDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Marcar como pagado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Metodo de pago</Label>
              <Select
                value={pagarMetodo}
                onValueChange={(v: string | null) => v && setPagarMetodo(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleMarcarPagado}
              disabled={submitting || !pagarMetodo}
            >
              {submitting ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
