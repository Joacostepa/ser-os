"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Send, Mail, Phone, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { EstadoBadge, TipoBadge } from "@/components/shared/status-badge"
import { KPIRow } from "@/components/reportes/kpi-row"
import { AlertItem } from "@/components/reportes/alert-item"
import { getPedidoResumen } from "@/lib/actions/operaciones"
import { completarTarea } from "@/lib/actions/tareas"
import { createClient } from "@/lib/supabase/client"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { formatearTiempoRelativo } from "@/lib/formatters"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

interface DetailPanelProps {
  pedidoId: string | null
  onClose: () => void
}

export function DetailPanel({ pedidoId, onClose }: DetailPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedido, setPedido] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)
  const supabase = createClient()

  const fetchPedido = useCallback(async () => {
    if (!pedidoId) return
    setLoading(true)
    try {
      const data = await getPedidoResumen(pedidoId)
      setPedido(data)
    } catch {
      toast.error("Error al cargar pedido")
    } finally {
      setLoading(false)
    }
  }, [pedidoId])

  useEffect(() => {
    fetchPedido()
  }, [fetchPedido])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  async function handleToggleTarea(tareaId: string) {
    try {
      await completarTarea(tareaId)
      toast.success("Tarea actualizada")
      fetchPedido()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar tarea")
    }
  }

  async function handleEnviarComentario(e: React.FormEvent) {
    e.preventDefault()
    if (!comentario.trim() || !pedidoId) return
    setEnviando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")
      const { data: usuario } = await supabase.from("usuarios").select("id").eq("auth_id", user.id).single()
      if (!usuario) throw new Error("Usuario no encontrado")
      await supabase.from("comentarios").insert({
        entidad_tipo: "pedido", entidad_id: pedidoId,
        usuario_id: usuario.id, contenido: comentario.trim(),
      })
      setComentario("")
      fetchPedido()
    } catch { toast.error("Error al enviar comentario") }
    finally { setEnviando(false) }
  }

  if (!pedidoId) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/5 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-[520px] max-w-full bg-white border-l border-stone-200 z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-medium text-stone-900">
              Pedido #{pedido?.numero_tn || pedido?.id?.slice(0, 8) || "..."}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              {pedido && <EstadoBadge estado={pedido.estado_interno} />}
              {pedido?.tipo === "personalizado" && <TipoBadge tipo="personalizado" />}
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 p-5 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : pedido ? (
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="detalle" className="h-full">
              <TabsList className="px-5 pt-3">
                <TabsTrigger value="detalle">Detalle</TabsTrigger>
                <TabsTrigger value="tareas">Tareas ({pedido.tareas?.length || 0})</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>

              {/* DETALLE TAB */}
              <TabsContent value="detalle" className="px-5 py-4 space-y-5">
                {/* Cliente */}
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-2">Cliente</p>
                  <p className="text-sm font-medium text-stone-800">{pedido.cliente?.nombre}</p>
                  {pedido.cliente?.email && (
                    <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-1">
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.5} /> {pedido.cliente.email}
                    </p>
                  )}
                  {pedido.cliente?.telefono && (
                    <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {pedido.cliente.telefono}
                    </p>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-2">Items del pedido</p>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {pedido.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                      <div>
                        <p className="text-sm text-stone-700">{item.descripcion || item.producto?.nombre}</p>
                        <p className="text-xs text-stone-400">x{item.cantidad}</p>
                      </div>
                      <span className="text-sm font-mono font-medium text-stone-700">
                        ${Number(item.subtotal).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-1">
                    <span className="text-sm font-medium text-stone-800">Total</span>
                    <span className="text-sm font-mono font-medium text-stone-900">
                      ${Number(pedido.monto_total).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* Pagos */}
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-2">Pagos</p>
                  <KPIRow label="Total" value={<span className="font-mono font-medium">${Number(pedido.monto_total).toLocaleString("es-AR")}</span>} />
                  <KPIRow label="Pagado" value={<span className="font-mono text-green-600">${Number(pedido.monto_pagado).toLocaleString("es-AR")}</span>} />
                  <KPIRow label="Saldo" value={
                    <span className={`font-mono font-medium ${Number(pedido.saldo_pendiente) > 0 ? "text-red-600" : "text-green-600"}`}>
                      ${Number(pedido.saldo_pendiente).toLocaleString("es-AR")}
                    </span>
                  } />
                </div>

                {/* Alertas */}
                {Number(pedido.saldo_pendiente) > 0 && pedido.estado_interno !== "pendiente_sena" && pedido.estado_interno !== "nuevo" && (
                  <AlertItem type="amber" text={`Saldo pendiente: $${Number(pedido.saldo_pendiente).toLocaleString("es-AR")}`} />
                )}

                {/* Link a detalle completo */}
                <a href={`/pedidos/${pedido.id}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Ver detalle completo
                </a>
              </TabsContent>

              {/* TAREAS TAB */}
              <TabsContent value="tareas" className="px-5 py-4">
                {pedido.tareas?.length > 0 ? (
                  <div className="space-y-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {pedido.tareas.map((t: any) => {
                      const isTerminada = t.estado === "terminada"
                      const isBloqueada = t.estado === "bloqueada"
                      return (
                        <div key={t.id} className="flex items-start gap-2.5 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 rounded px-1 -mx-1">
                          <button
                            onClick={() => !isBloqueada && handleToggleTarea(t.id)}
                            disabled={isBloqueada}
                            className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isTerminada ? "bg-green-600 border-green-600 text-white"
                              : isBloqueada ? "bg-red-50 border-red-300 cursor-not-allowed"
                              : "border-stone-300 hover:border-stone-400"
                            }`}
                          >
                            {isTerminada && <span className="text-xs">✓</span>}
                            {isBloqueada && <span className="text-[10px]">🔒</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isTerminada ? "line-through text-stone-400" : isBloqueada ? "text-stone-400" : "text-stone-700"}`}>
                              {t.titulo}
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {isTerminada && t.completada_en && `Completada ${formatearTiempoRelativo(t.completada_en)}`}
                              {!isTerminada && t.responsable?.nombre && t.responsable.nombre}
                              {!isTerminada && t.fecha_limite && ` · Vence ${format(new Date(t.fecha_limite), "dd/MM", { locale: es })}`}
                              {isBloqueada && " · Bloqueada por dependencia"}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 text-center py-8">Sin tareas asignadas</p>
                )}
              </TabsContent>

              {/* HISTORIAL TAB */}
              <TabsContent value="historial" className="px-5 py-4">
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const events: { texto: string; fecha: string; tipo: string }[] = []
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  pedido.historial?.forEach((h: any) => events.push({ tipo: "estado", texto: h.accion || `Estado → ${h.estado_nuevo}`, fecha: h.created_at }))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  pedido.pagos?.forEach((p: any) => events.push({ tipo: "pago", texto: `Pago: $${Number(p.monto).toLocaleString("es-AR")} (${p.metodo})`, fecha: p.fecha }))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  pedido.comentarios?.forEach((c: any) => events.push({ tipo: "comentario", texto: `${c.usuario?.nombre}: "${c.contenido.slice(0, 60)}${c.contenido.length > 60 ? "..." : ""}"`, fecha: c.created_at }))
                  events.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

                  const DOT = { estado: "bg-blue-500", pago: "bg-amber-500", comentario: "bg-stone-400" }

                  return events.length > 0 ? (
                    <div className="relative pl-6">
                      <div className="absolute left-[9px] top-0 bottom-0 w-px bg-stone-200" />
                      {events.slice(0, 15).map((ev, i) => (
                        <div key={i} className="relative pb-4">
                          <div className={`absolute left-[-24px] top-[6px] w-[18px] h-[18px] rounded-full bg-white border-2 border-stone-200 flex items-center justify-center`}>
                            <div className={`w-2 h-2 rounded-full ${DOT[ev.tipo as keyof typeof DOT] || "bg-stone-300"}`} />
                          </div>
                          <p className="text-sm text-stone-600">{ev.texto}</p>
                          <p className="text-xs text-stone-400">{formatearTiempoRelativo(ev.fecha)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 text-center py-8">Sin historial</p>
                  )
                })()}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {/* Footer: Comment input */}
        <div className="border-t border-stone-200 px-4 py-3 bg-white">
          <form onSubmit={handleEnviarComentario} className="flex items-center gap-2">
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Agregar comentario..."
              className="min-h-[36px] h-9 resize-none text-sm bg-stone-50 border-none rounded-lg px-3 py-2 focus:bg-white focus:ring-1 focus:ring-stone-200"
              rows={1}
            />
            {comentario.trim() && (
              <Button type="submit" size="icon" variant="ghost" disabled={enviando} className="shrink-0 text-stone-400 hover:text-blue-600">
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
          </form>
        </div>
      </div>
    </>
  )
}
