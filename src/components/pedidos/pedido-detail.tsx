"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Calendar,
  CreditCard,
  FileText,
  MessageSquare,
  Paperclip,
  User,
} from "lucide-react"
import { EstadoBadge, PrioridadBadge, TipoBadge } from "@/components/shared/status-badge"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import { TareasChecklist } from "@/components/tareas/tareas-checklist"
import { PedidoHistorial } from "./pedido-historial"
import { PedidoComentarios } from "./pedido-comentarios"
import { actualizarEstadoPedido } from "@/lib/actions/pedidos"
import { toast } from "sonner"
import type { EstadoInterno } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PedidoDetail({ pedido }: { pedido: any }) {
  const router = useRouter()
  const [estadoLoading, setEstadoLoading] = useState(false)

  async function handleCambiarEstado(nuevoEstado: string) {
    setEstadoLoading(true)
    try {
      await actualizarEstadoPedido(pedido.id, nuevoEstado as EstadoInterno)
      toast.success(`Estado cambiado a ${ESTADOS_INTERNOS[nuevoEstado as EstadoInterno].label}`)
      router.refresh()
    } catch {
      toast.error("Error al cambiar el estado")
    } finally {
      setEstadoLoading(false)
    }
  }

  const tareasCompletadas = pedido.tareas?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.estado === "terminada"
  ).length ?? 0
  const tareasTotal = pedido.tareas?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/pedidos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Pedido {pedido.numero_tn || `#${pedido.id.slice(0, 8)}`}
              </h1>
              <TipoBadge tipo={pedido.tipo} />
            </div>
            <p className="text-sm text-muted-foreground">
              Creado {format(new Date(pedido.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EstadoBadge estado={pedido.estado_interno} />
          <Select
            value={pedido.estado_interno}
            onValueChange={handleCambiarEstado}
            disabled={estadoLoading}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ESTADOS_INTERNOS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              Cliente
            </div>
            <p className="font-medium">{pedido.cliente?.nombre}</p>
            <p className="text-sm text-muted-foreground">{pedido.cliente?.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              Pagos
            </div>
            <p className="font-medium">
              ${Number(pedido.monto_pagado).toLocaleString("es-AR")} / ${Number(pedido.monto_total).toLocaleString("es-AR")}
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min((pedido.monto_pagado / pedido.monto_total) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Entrega
            </div>
            <p className="font-medium">
              {pedido.fecha_comprometida
                ? format(new Date(pedido.fecha_comprometida), "dd MMM yyyy", { locale: es })
                : "Sin fecha"}
            </p>
            <PrioridadBadge prioridad={pedido.prioridad} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              Tareas
            </div>
            <p className="font-medium">{tareasCompletadas} / {tareasTotal} completadas</p>
            {tareasTotal > 0 && (
              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(tareasCompletadas / tareasTotal) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tareas">
        <TabsList>
          <TabsTrigger value="tareas">
            Tareas ({tareasTotal})
          </TabsTrigger>
          <TabsTrigger value="items">
            Items ({pedido.items?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="pagos">
            Pagos ({pedido.pagos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="historial">
            <FileText className="h-4 w-4 mr-1" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="comentarios">
            <MessageSquare className="h-4 w-4 mr-1" />
            Comentarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tareas" className="mt-4">
          <TareasChecklist tareas={pedido.tareas || []} pedidoId={pedido.id} />
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Variante</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {pedido.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.descripcion || item.producto?.nombre || "—"}</TableCell>
                      <TableCell>{item.variante?.nombre || "—"}</TableCell>
                      <TableCell className="text-right">{item.cantidad}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${Number(item.precio_unitario).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        ${Number(item.subtotal).toLocaleString("es-AR")}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      ${Number(pedido.monto_total).toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {pedido.pagos?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {pedido.pagos.map((pago: any) => (
                      <TableRow key={pago.id}>
                        <TableCell>
                          {format(new Date(pago.fecha), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="capitalize">{pago.concepto.replace("_", " ")}</TableCell>
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
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <PedidoHistorial historial={pedido.historial || []} />
        </TabsContent>

        <TabsContent value="comentarios" className="mt-4">
          <PedidoComentarios
            comentarios={pedido.comentarios || []}
            pedidoId={pedido.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
