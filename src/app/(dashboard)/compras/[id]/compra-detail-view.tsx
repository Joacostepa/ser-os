"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { KPIRow } from "@/components/reportes/kpi-row"
import { CondicionFiscalBadge } from "@/components/shared/condicion-fiscal-badge"
import {
  ESTADO_COMPRA_CONFIG,
  ESTADO_PAGO_COMPRA_CONFIG,
  CALIDAD_RECEPCION,
  CONDICION_PAGO_OPTIONS,
  METODOS_PAGO,
} from "@/lib/constants"
import {
  formatearMontoCompleto,
  formatearTiempoRelativo,
} from "@/lib/formatters"
import {
  actualizarEstadoCompra,
  registrarPagoProveedor,
} from "@/lib/actions/compras"
import type { EstadoCompra } from "@/types/database"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ConfirmacionIVAModal } from "@/components/shared/confirmacion-iva-modal"
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  CreditCard,
  Package,
  Loader2,
  Check,
} from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CompraDetailView({ compra }: { compra: any }) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState(false)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)

  // Pago form
  const [pagoMonto, setPagoMonto] = useState(0)
  const [pagoMetodo, setPagoMetodo] = useState("")
  const [pagoFecha, setPagoFecha] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [pagoObs, setPagoObs] = useState("")
  const [pagoSubmitting, setPagoSubmitting] = useState(false)
  const [confirmPagoOpen, setConfirmPagoOpen] = useState(false)

  const estadoConfig =
    ESTADO_COMPRA_CONFIG[compra.estado as EstadoCompra]
  const pagoConfig =
    ESTADO_PAGO_COMPRA_CONFIG[
      compra.estado_pago as keyof typeof ESTADO_PAGO_COMPRA_CONFIG
    ]

  const totalCompra =
    Number(compra.subtotal || 0) - Number(compra.descuento || 0)
  const totalPagado = (compra.pagos ?? []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: number, p: any) => s + Number(p.monto),
    0
  )
  const saldo = totalCompra - totalPagado

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalItems = compra.items?.length ?? 0
  const itemsRecibidos =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compra.items?.filter((i: any) => i.cantidad_recibida >= i.cantidad)
      .length ?? 0

  const condicionLabel = CONDICION_PAGO_OPTIONS.find(
    (o) => o.value === compra.condicion_pago
  )?.label

  async function handleEstado(nuevoEstado: EstadoCompra) {
    setActionLoading(true)
    try {
      await actualizarEstadoCompra(compra.id, nuevoEstado)
      toast.success(
        `Estado actualizado a "${ESTADO_COMPRA_CONFIG[nuevoEstado].label}"`
      )
      router.refresh()
    } catch {
      toast.error("Error al actualizar estado")
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePago() {
    if (!pagoMonto || !pagoMetodo) {
      toast.error("Completa monto y metodo de pago")
      return
    }
    setPagoSubmitting(true)
    try {
      await registrarPagoProveedor({
        compra_id: compra.id,
        proveedor_id: compra.proveedor_id,
        proveedor_nombre: compra.proveedor?.nombre,
        monto: pagoMonto,
        metodo_pago: pagoMetodo,
        fecha: pagoFecha,
        observaciones: pagoObs || undefined,
      })
      toast.success("Pago registrado")
      setPagoDialogOpen(false)
      setPagoMonto(0)
      setPagoMetodo("")
      setPagoObs("")
      router.refresh()
    } catch {
      toast.error("Error al registrar pago")
    } finally {
      setPagoSubmitting(false)
    }
  }

  // Build timeline for historial
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: { tipo: string; fecha: string; descripcion: string }[] = []

  if (compra.created_at) {
    timeline.push({
      tipo: "estado",
      fecha: compra.created_at,
      descripcion: "Orden creada",
    })
  }
  if (compra.fecha_envio) {
    timeline.push({
      tipo: "estado",
      fecha: compra.fecha_envio,
      descripcion: "Enviada al proveedor",
    })
  }
  if (compra.fecha_confirmacion) {
    timeline.push({
      tipo: "estado",
      fecha: compra.fecha_confirmacion,
      descripcion: "Confirmada por proveedor",
    })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(compra.recepciones ?? []).forEach((r: any) => {
    timeline.push({
      tipo: "recepcion",
      fecha: r.created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      descripcion: `Recepcion registrada (${r.items?.length ?? 0} items)`,
    })
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(compra.pagos ?? []).forEach((p: any) => {
    timeline.push({
      tipo: "pago",
      fecha: p.created_at,
      descripcion: `Pago ${formatearMontoCompleto(Number(p.monto))} via ${p.metodo_pago}`,
    })
  })
  if (compra.fecha_recibida) {
    timeline.push({
      tipo: "estado",
      fecha: compra.fecha_recibida,
      descripcion: "Compra recibida",
    })
  }

  timeline.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  // Contextual action buttons
  function renderActions() {
    const estado = compra.estado as EstadoCompra
    return (
      <div className="flex items-center gap-2">
        {estado === "borrador" && (
          <>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleEstado("enviada")}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Enviar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={actionLoading}
              onClick={() => handleEstado("cancelada")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </>
        )}
        {estado === "enviada" && (
          <>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleEstado("confirmada")}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={actionLoading}
              onClick={() => handleEstado("cancelada")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </>
        )}
        {(estado === "confirmada" || estado === "recibida_parcial") && (
          <>
            <Link href={`/compras/${compra.id}/recepcion`}>
              <Button size="sm" variant="outline">
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Registrar recepcion
              </Button>
            </Link>
            <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <CreditCard className="h-4 w-4 mr-1" />
                Registrar pago
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Registrar pago</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-stone-600">Monto</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={pagoMonto}
                      onChange={(e) =>
                        setPagoMonto(parseFloat(e.target.value) || 0)
                      }
                      className="font-mono"
                    />
                    {saldo > 0 && (
                      <p className="text-xs text-stone-400">
                        Saldo pendiente: {formatearMontoCompleto(saldo)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-600">Metodo de pago</Label>
                    <Select
                      value={pagoMetodo}
                      onValueChange={(v: string | null) =>
                        v && setPagoMetodo(v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar..." />
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
                  <div className="space-y-2">
                    <Label className="text-stone-600">Fecha</Label>
                    <Input
                      type="date"
                      value={pagoFecha}
                      onChange={(e) => setPagoFecha(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-600">Observaciones</Label>
                    <Textarea
                      value={pagoObs}
                      onChange={(e) => setPagoObs(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={pagoSubmitting}
                    onClick={() => setConfirmPagoOpen(true)}
                  >
                    {pagoSubmitting ? "Registrando..." : "Registrar pago"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
        {estado === "recibida" && compra.estado_pago !== "pagada" && (
          <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <CreditCard className="h-4 w-4 mr-1" />
              Registrar pago
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar pago</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-stone-600">Monto</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={pagoMonto}
                    onChange={(e) =>
                      setPagoMonto(parseFloat(e.target.value) || 0)
                    }
                    className="font-mono"
                  />
                  {saldo > 0 && (
                    <p className="text-xs text-stone-400">
                      Saldo pendiente: {formatearMontoCompleto(saldo)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-stone-600">Metodo de pago</Label>
                  <Select
                    value={pagoMetodo}
                    onValueChange={(v: string | null) =>
                      v && setPagoMetodo(v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar..." />
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
                <div className="space-y-2">
                  <Label className="text-stone-600">Fecha</Label>
                  <Input
                    type="date"
                    value={pagoFecha}
                    onChange={(e) => setPagoFecha(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-stone-600">Observaciones</Label>
                  <Textarea
                    value={pagoObs}
                    onChange={(e) => setPagoObs(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={pagoSubmitting}
                  onClick={() => setConfirmPagoOpen(true)}
                >
                  {pagoSubmitting ? "Registrando..." : "Registrar pago"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/compras">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-stone-900">
                OC {compra.numero_orden || `#${compra.id.slice(0, 8)}`}
              </h1>
              <Badge variant="secondary" className={estadoConfig?.color}>
                {estadoConfig?.label}
              </Badge>
              {pagoConfig && (
                <span className={`text-xs font-medium ${pagoConfig.color}`}>
                  {pagoConfig.label}
                </span>
              )}
            </div>
            <p className="text-sm text-stone-400 flex items-center gap-2">
              <span>{compra.proveedor?.nombre}</span>
              <CondicionFiscalBadge condicion={compra.proveedor?.condicion_fiscal} />
              <span>---</span>
              {format(
                new Date(compra.created_at),
                "dd/MM/yyyy HH:mm",
                { locale: es }
              )}
            </p>
          </div>
        </div>
        {renderActions()}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="detalle">
        <TabsList variant="line">
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="recepciones">
            Recepciones ({compra.recepciones?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="pagos">
            Pagos ({compra.pagos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* ===================== DETALLE ===================== */}
        <TabsContent value="detalle" className="space-y-4 mt-4">
          {/* Info grid */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-stone-400 mb-1">Proveedor</p>
                <Link
                  href={`/proveedores/${compra.proveedor?.id}`}
                  className="text-sm font-medium text-stone-800 hover:underline"
                >
                  {compra.proveedor?.nombre}
                </Link>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Pedido vinculado</p>
                {compra.pedido ? (
                  <Link
                    href={`/pedidos/${compra.pedido.id}`}
                    className="text-sm font-medium text-stone-800 hover:underline"
                  >
                    #{compra.pedido.numero_tn || compra.pedido.id.slice(0, 8)}
                  </Link>
                ) : (
                  <span className="text-sm text-stone-400">---</span>
                )}
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Condicion pago</p>
                <span className="text-sm text-stone-700">
                  {condicionLabel ?? compra.condicion_pago ?? "---"}
                </span>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Recepcion</p>
                <span className="text-sm text-stone-700">
                  {itemsRecibidos}/{totalItems} items
                </span>
                {totalItems > 0 && (
                  <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(itemsRecibidos / totalItems) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-stone-100">
              <div>
                <p className="text-xs text-stone-400 mb-1">Fecha orden</p>
                <span className="text-sm text-stone-700">
                  {compra.fecha_pedido
                    ? format(new Date(compra.fecha_pedido), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "---"}
                </span>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Fecha envio</p>
                <span className="text-sm text-stone-700">
                  {compra.fecha_envio
                    ? format(new Date(compra.fecha_envio), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "---"}
                </span>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Entrega esperada</p>
                <span className="text-sm text-stone-700">
                  {compra.fecha_esperada
                    ? format(new Date(compra.fecha_esperada), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "---"}
                </span>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Fecha recibida</p>
                <span className="text-sm text-stone-700">
                  {compra.fecha_recibida
                    ? format(new Date(compra.fecha_recibida), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "---"}
                </span>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-sm font-medium text-stone-800 mb-3">
              Items de la compra
            </h3>
            {compra.items && compra.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripcion</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Pedido</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {compra.items.map((item: any) => {
                    const completo =
                      item.cantidad_recibida >= item.cantidad
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-stone-800">
                          {item.descripcion}
                        </TableCell>
                        <TableCell>
                          {item.producto ? (
                            <Link
                              href={`/productos/${item.producto.id}`}
                              className="text-stone-600 hover:underline text-sm"
                            >
                              {item.producto.nombre}
                            </Link>
                          ) : (
                            <span className="text-stone-300">---</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-stone-600">
                          {item.cantidad}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="inline-flex items-center gap-1">
                            {completo && (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            )}
                            <span
                              className={
                                completo
                                  ? "text-green-600"
                                  : item.cantidad_recibida > 0
                                    ? "text-amber-600"
                                    : "text-stone-400"
                              }
                            >
                              {item.cantidad_recibida}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-stone-600">
                          {formatearMontoCompleto(
                            Number(item.precio_unitario)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-stone-800">
                          {formatearMontoCompleto(Number(item.subtotal))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-stone-400 py-4">No hay items</p>
            )}

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-stone-100 max-w-xs ml-auto">
              <KPIRow
                label="Subtotal"
                value={
                  <span className="font-mono">
                    {formatearMontoCompleto(Number(compra.subtotal || 0))}
                  </span>
                }
              />
              {Number(compra.descuento) > 0 && (
                <KPIRow
                  label="Descuento"
                  value={
                    <span className="font-mono text-green-600">
                      -{formatearMontoCompleto(Number(compra.descuento))}
                    </span>
                  }
                />
              )}
              {compra.incluye_iva && (
                <>
                  <KPIRow
                    label="Neto"
                    value={
                      <span className="font-mono">
                        {formatearMontoCompleto(Number(compra.subtotal_neto || 0))}
                      </span>
                    }
                  />
                  <KPIRow
                    label="IVA 21%"
                    value={
                      <span className="font-mono">
                        {formatearMontoCompleto(Number(compra.monto_iva || 0))}
                      </span>
                    }
                  />
                </>
              )}
              <KPIRow
                label="Total"
                bold
                value={
                  <span className="font-mono">
                    {formatearMontoCompleto(totalCompra)}
                  </span>
                }
              />
              {compra.monto_total_usd && (
                <KPIRow
                  label="Equiv. USD"
                  value={
                    <span className="font-mono text-green-700">
                      US${Number(compra.monto_total_usd).toLocaleString(
                        "es-AR",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  }
                />
              )}
            </div>
          </div>

          {/* Notas */}
          {(compra.notas || compra.notas_internas) && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
              {compra.notas && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">
                    Notas para el proveedor
                  </p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">
                    {compra.notas}
                  </p>
                </div>
              )}
              {compra.notas_internas && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Notas internas</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">
                    {compra.notas_internas}
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===================== RECEPCIONES ===================== */}
        <TabsContent value="recepciones" className="space-y-4 mt-4">
          {(compra.estado === "confirmada" ||
            compra.estado === "recibida_parcial") && (
            <div className="flex justify-end">
              <Link href={`/compras/${compra.id}/recepcion`}>
                <Button size="sm">
                  <Package className="h-4 w-4 mr-1" />
                  Registrar recepcion
                </Button>
              </Link>
            </div>
          )}

          {compra.recepciones && compra.recepciones.length > 0 ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            compra.recepciones.map((rec: any) => (
              <div
                key={rec.id}
                className="rounded-xl border border-stone-200 bg-white p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      Recepcion del{" "}
                      {format(new Date(rec.fecha || rec.created_at), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </p>
                    {rec.notas && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {rec.notas}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">
                    {formatearTiempoRelativo(rec.created_at)}
                  </span>
                </div>

                {rec.items && rec.items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Calidad</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {rec.items.map((ir: any) => {
                        const calidad =
                          CALIDAD_RECEPCION[
                            ir.estado_calidad as keyof typeof CALIDAD_RECEPCION
                          ]
                        return (
                          <TableRow key={ir.id}>
                            <TableCell className="text-stone-700">
                              {ir.item_compra?.descripcion ?? "---"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-stone-700">
                              {ir.cantidad_recibida}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-medium ${
                                  calidad?.color ?? "text-stone-500"
                                }`}
                              >
                                {calidad?.label ?? ir.estado_calidad}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-stone-400">
                              {ir.notas ?? "---"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
              <Package className="h-8 w-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">
                No se registraron recepciones aun
              </p>
            </div>
          )}
        </TabsContent>

        {/* ===================== PAGOS ===================== */}
        <TabsContent value="pagos" className="space-y-4 mt-4">
          {/* Summary */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-sm font-medium text-stone-800 mb-3">
              Resumen de pagos
            </h3>
            <KPIRow
              label="Total compra"
              value={
                <span className="font-mono">
                  {formatearMontoCompleto(totalCompra)}
                </span>
              }
            />
            <KPIRow
              label="Total pagado"
              value={
                <span className="font-mono text-green-600">
                  {formatearMontoCompleto(totalPagado)}
                </span>
              }
            />
            <KPIRow
              label="Saldo pendiente"
              bold
              value={
                <span
                  className={`font-mono ${
                    saldo > 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {formatearMontoCompleto(saldo)}
                </span>
              }
            />
          </div>

          {/* Pagos list */}
          {compra.pagos && compra.pagos.length > 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {compra.pagos.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-stone-600 text-sm">
                        {format(new Date(p.fecha), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell className="text-stone-700 text-sm">
                        {p.metodo_pago}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-stone-800">
                        {formatearMontoCompleto(Number(p.monto))}
                      </TableCell>
                      <TableCell className="text-xs text-stone-400">
                        {p.observaciones ?? "---"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
              <CreditCard className="h-8 w-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">
                No se registraron pagos aun
              </p>
            </div>
          )}
        </TabsContent>

        {/* ===================== HISTORIAL ===================== */}
        <TabsContent value="historial" className="mt-4">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            {timeline.length > 0 ? (
              <div className="space-y-0">
                {timeline.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        ev.tipo === "estado"
                          ? "bg-stone-400"
                          : ev.tipo === "recepcion"
                            ? "bg-green-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700">{ev.descripcion}</p>
                      <p className="text-xs text-stone-400">
                        {formatearTiempoRelativo(ev.fecha)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-stone-400 py-4 text-sm">
                Sin historial
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmacionIVAModal
        open={confirmPagoOpen}
        onClose={() => setConfirmPagoOpen(false)}
        onConfirm={() => {
          setConfirmPagoOpen(false)
          handlePago()
        }}
        tipo="pago_proveedor"
        titulo={`OC-${compra.numero_orden}`}
        monto={Number(pagoMonto)}
        incluyeIvaDefault={compra.incluye_iva}
        proveedorNombre={compra.proveedor?.nombre}
        condicionFiscal={compra.proveedor?.condicion_fiscal}
        totalOC={Number(compra.subtotal) - Number(compra.descuento || 0)}
        yaPagado={totalPagado}
      />
    </div>
  )
}
