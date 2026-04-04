"use client"

import { useEffect, useState } from "react"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Check } from "lucide-react"
import { getCuentasAPagar, marcarGastoPagado } from "@/lib/actions/finanzas"
import { ESTADO_COMPRA_CONFIG, METODOS_PAGO } from "@/lib/constants"
import { formatearMontoCompleto } from "@/lib/formatters"
import { toast } from "sonner"

export default function CuentasAPagarPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compras, setCompras] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gastos, setGastos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Marcar pagado dialog
  const [pagarDialogOpen, setPagarDialogOpen] = useState(false)
  const [pagarGastoId, setPagarGastoId] = useState("")
  const [pagarMetodo, setPagarMetodo] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getCuentasAPagar()
      setCompras(data.compras || [])
      setGastos(data.gastos || [])
    } catch {
      setCompras([])
      setGastos([])
    }
    setLoading(false)
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
      await fetchData()
    } catch {
      toast.error("Error al marcar como pagado")
    } finally {
      setSubmitting(false)
    }
  }

  function formatFecha(fecha: string | null) {
    if (!fecha) return "—"
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Cuentas a pagar</h1>
        <p className="text-sm text-stone-400">Obligaciones pendientes con proveedores y gastos</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Compras pendientes */}
          <DashboardCard
            title="Compras pendientes"
            description={`${compras.length} órdenes de compra activas`}
          >
            {compras.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-stone-500">OC #</TableHead>
                    <TableHead className="text-stone-500">Proveedor</TableHead>
                    <TableHead className="text-stone-500 text-right">Total</TableHead>
                    <TableHead className="text-stone-500">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {compras.map((compra: any) => {
                    const estadoConf = ESTADO_COMPRA_CONFIG[compra.estado as keyof typeof ESTADO_COMPRA_CONFIG]
                    return (
                      <TableRow key={compra.id}>
                        <TableCell className="text-sm text-stone-800">
                          #{compra.id.toString().slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm text-stone-800">
                          {compra.proveedor}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-stone-800">
                            {formatearMontoCompleto(compra.total)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {estadoConf ? (
                            <Badge className={`${estadoConf.color} text-xs`}>
                              {estadoConf.label}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{compra.estado}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-stone-400 text-center py-6">Sin compras pendientes</p>
            )}
          </DashboardCard>

          {/* Gastos pendientes */}
          <DashboardCard
            title="Gastos pendientes"
            description={`${gastos.length} gastos sin pagar`}
          >
            {gastos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-stone-500">Fecha</TableHead>
                    <TableHead className="text-stone-500">Descripción</TableHead>
                    <TableHead className="text-stone-500">Categoría</TableHead>
                    <TableHead className="text-stone-500 text-right">Monto</TableHead>
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
                          {gasto.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm text-stone-800">
                          {formatearMontoCompleto(gasto.monto)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPagarGastoId(gasto.id)
                            setPagarDialogOpen(true)
                          }}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Marcar pagado
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-stone-400 text-center py-6">Sin gastos pendientes</p>
            )}
          </DashboardCard>
        </>
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
