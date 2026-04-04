"use client"

import { useEffect, useState } from "react"
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Check } from "lucide-react"
import { getGastos, crearGasto, marcarGastoPagado, getCategoriaGastos } from "@/lib/actions/finanzas"
import { METODOS_PAGO } from "@/lib/constants"
import { formatearMontoCompleto } from "@/lib/formatters"
import { toast } from "sonner"

export default function GastosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gastos, setGastos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [filtroCategoria, setFiltroCategoria] = useState("todas")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  // New gasto form
  const [formDescripcion, setFormDescripcion] = useState("")
  const [formCategoriaId, setFormCategoriaId] = useState("")
  const [formMonto, setFormMonto] = useState("")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formPagado, setFormPagado] = useState(false)
  const [formMetodo, setFormMetodo] = useState("")
  const [formObservaciones, setFormObservaciones] = useState("")

  // Marcar pagado dialog
  const [pagarDialogOpen, setPagarDialogOpen] = useState(false)
  const [pagarGastoId, setPagarGastoId] = useState("")
  const [pagarMetodo, setPagarMetodo] = useState("")

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const [gastosData, categoriasData] = await Promise.all([
          getGastos({
            pagado: filtroEstado !== "todos" ? filtroEstado : undefined,
          }),
          getCategoriaGastos(),
        ])
        setCategorias(categoriasData)

        let filtered = gastosData || []
        if (filtroCategoria !== "todas") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filtered = filtered.filter((g: any) => g.cuenta?.id === Number(filtroCategoria))
        }
        setGastos(filtered)
      } catch {
        setGastos([])
      }
      setLoading(false)
    }
    fetch()
  }, [filtroCategoria, filtroEstado])

  async function handleCrearGasto(e: React.FormEvent) {
    e.preventDefault()
    if (!formDescripcion || !formCategoriaId || !formMonto) {
      toast.error("Completá los campos requeridos")
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
      })
      toast.success("Gasto registrado")
      setDialogOpen(false)
      resetForm()
      // Re-fetch
      const data = await getGastos({ pagado: filtroEstado !== "todos" ? filtroEstado : undefined })
      setGastos(data || [])
    } catch {
      toast.error("Error al registrar el gasto")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarcarPagado() {
    if (!pagarGastoId || !pagarMetodo) {
      toast.error("Seleccioná un método de pago")
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
      const data = await getGastos({ pagado: filtroEstado !== "todos" ? filtroEstado : undefined })
      setGastos(data || [])
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
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Gastos</h1>
        <p className="text-sm text-stone-400">Registro y seguimiento de gastos operativos</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filtroCategoria} onValueChange={(v: string | null) => v && setFiltroCategoria(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {categorias.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={(v: string | null) => v && setFiltroEstado(v)}>
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo gasto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrearGasto} className="space-y-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Envío MercadoEnvíos"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={formCategoriaId} onValueChange={(v: string | null) => v && setFormCategoriaId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {categorias.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
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
                  <Label>Método de pago</Label>
                  <Select value={formMetodo} onValueChange={(v: string | null) => v && setFormMetodo(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formPagado}
                  onCheckedChange={(checked) => setFormPagado(checked === true)}
                />
                <Label className="text-sm text-stone-600">Ya está pagado</Label>
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>
              <DialogFooter>
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
      ) : gastos.length > 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-stone-500">Fecha</TableHead>
                <TableHead className="text-stone-500">Descripción</TableHead>
                <TableHead className="text-stone-500">Categoría</TableHead>
                <TableHead className="text-stone-500 text-right">Monto</TableHead>
                <TableHead className="text-stone-500">Estado</TableHead>
                <TableHead className="text-stone-500"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {gastos.map((gasto: any) => (
                <TableRow key={gasto.id}>
                  <TableCell className="text-sm text-stone-600">
                    {formatFecha(gasto.fecha)}
                  </TableCell>
                  <TableCell className="text-sm text-stone-800">
                    {gasto.descripcion}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {gasto.cuenta?.nombre || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm text-stone-800">
                      {formatearMontoCompleto(Number(gasto.monto))}
                    </span>
                  </TableCell>
                  <TableCell>
                    {gasto.pagado ? (
                      <Badge className="bg-green-50 text-green-700 text-xs">Pagado</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 text-xs">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!gasto.pagado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPagarGastoId(gasto.id)
                          setPagarDialogOpen(true)
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">No hay gastos registrados</p>
      )}

      {/* Dialog marcar como pagado */}
      <Dialog open={pagarDialogOpen} onOpenChange={setPagarDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Marcar como pagado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={pagarMetodo} onValueChange={(v: string | null) => v && setPagarMetodo(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleMarcarPagado} disabled={submitting || !pagarMetodo}>
              {submitting ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
