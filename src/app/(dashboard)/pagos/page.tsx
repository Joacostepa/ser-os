"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Plus, AlertTriangle } from "lucide-react"
import { registrarPago } from "@/lib/actions/pagos"
import { METODOS_PAGO } from "@/lib/constants"
import { toast } from "sonner"
import Link from "next/link"

export default function PagosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pagos, setPagos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendientes, setPendientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  // Form state
  const [formPedidoId, setFormPedidoId] = useState("")
  const [formClienteId, setFormClienteId] = useState("")
  const [formMonto, setFormMonto] = useState("")
  const [formMetodo, setFormMetodo] = useState("")
  const [formConcepto, setFormConcepto] = useState<"sena" | "saldo" | "pago_total">("sena")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formNotas, setFormNotas] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [pagosRes, pendientesRes] = await Promise.all([
        supabase
          .from("pagos")
          .select("*, pedido:pedidos(id, numero_tn), cliente:clientes(id, nombre)")
          .eq("tipo", "cobro")
          .order("fecha", { ascending: false })
          .limit(50),
        supabase
          .from("pedidos")
          .select("id, numero_tn, monto_total, monto_pagado, saldo_pendiente, created_at, cliente:clientes(id, nombre)")
          .gt("saldo_pendiente", 0)
          .not("estado_interno", "in", '("cerrado","cancelado")')
          .order("created_at", { ascending: true }),
      ])

      setPagos(pagosRes.data || [])
      setPendientes(pendientesRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  async function handleRegistrarPago(e: React.FormEvent) {
    e.preventDefault()
    if (!formPedidoId || !formMonto || !formMetodo) {
      toast.error("Completá todos los campos requeridos")
      return
    }

    setSubmitting(true)
    try {
      await registrarPago({
        pedido_id: formPedidoId,
        cliente_id: formClienteId,
        monto: parseFloat(formMonto),
        metodo: formMetodo,
        concepto: formConcepto,
        fecha: formFecha,
        notas: formNotas || undefined,
      })
      toast.success("Pago registrado")
      setDialogOpen(false)
      // Reset form
      setFormPedidoId("")
      setFormClienteId("")
      setFormMonto("")
      setFormMetodo("")
      setFormNotas("")
      // Re-fetch
      window.location.reload()
    } catch {
      toast.error("Error al registrar el pago")
    } finally {
      setSubmitting(false)
    }
  }

  // Pre-fill form when clicking a pending order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSelectPendiente(pedido: any) {
    setFormPedidoId(pedido.id)
    setFormClienteId(pedido.cliente?.id || "")
    setFormMonto(String(pedido.saldo_pendiente))
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobros</h1>
          <p className="text-sm text-muted-foreground">Gestión de cobros a clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar cobro
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar cobro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pedido ID</Label>
                  <Input value={formPedidoId} onChange={(e) => setFormPedidoId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Cliente ID</Label>
                  <Input value={formClienteId} onChange={(e) => setFormClienteId(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" step="0.01" value={formMonto} onChange={(e) => setFormMonto(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Concepto</Label>
                  <Select value={formConcepto} onValueChange={(v) => setFormConcepto(v as typeof formConcepto)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sena">Seña</SelectItem>
                      <SelectItem value="saldo">Saldo</SelectItem>
                      <SelectItem value="pago_total">Pago total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <Select value={formMetodo} onValueChange={(v) => v && setFormMetodo(v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input value={formNotas} onChange={(e) => setFormNotas(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Registrando..." : "Registrar cobro"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de pago pendiente */}
      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Pedidos con saldo pendiente ({pendientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pendientes.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/pedidos/${p.id}`} className="hover:underline font-medium">
                        {p.numero_tn || `#${p.id.slice(0, 8)}`}
                      </Link>
                    </TableCell>
                    <TableCell>{p.cliente?.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">${Number(p.monto_total).toLocaleString("es-AR")}</TableCell>
                    <TableCell className="text-right tabular-nums">${Number(p.monto_pagado).toLocaleString("es-AR")}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-red-600">
                      ${Number(p.saldo_pendiente).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleSelectPendiente(p)}>
                        Registrar cobro
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Historial de pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos pagos registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pagos.map((pago: any) => (
                  <TableRow key={pago.id}>
                    <TableCell>{format(new Date(pago.fecha), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell>
                      {pago.pedido && (
                        <Link href={`/pedidos/${pago.pedido.id}`} className="hover:underline">
                          {pago.pedido.numero_tn || `#${pago.pedido.id.slice(0, 8)}`}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>{pago.cliente?.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {pago.concepto.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{pago.metodo}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      ${Number(pago.monto).toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay pagos registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
