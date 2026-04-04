import { AlertItem } from "@/components/reportes/alert-item"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { format } from "date-fns"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AlertBar({ pedido }: { pedido: any }) {
  type Alert = { type: "red" | "amber" | "blue"; text: string }
  const alertas: Alert[] = []

  const saldo = Number(pedido.saldo_pendiente || 0)
  const montoPagado = Number(pedido.monto_pagado || 0)
  const estado = pedido.estado_interno

  // Pago parcial
  if (montoPagado > 0 && saldo > 0) {
    alertas.push({
      type: "amber",
      text: `Pago parcial: Seña de $${montoPagado.toLocaleString("es-AR")} recibida. Saldo pendiente: $${saldo.toLocaleString("es-AR")}`,
    })
  }

  // Sin pago en estados que lo necesitan
  if (montoPagado === 0 && !["nuevo", "pendiente_sena", "cerrado", "cancelado"].includes(estado)) {
    alertas.push({
      type: "red",
      text: "Sin pago registrado. El pedido no puede avanzar a armado sin anticipo.",
    })
  }

  // Esperando insumos
  if (estado === "esperando_insumos") {
    alertas.push({ type: "amber", text: "Pedido bloqueado: esperando insumos de proveedores." })
  }

  // Esperando diseño
  if (estado === "esperando_diseno") {
    alertas.push({ type: "amber", text: "Esperando aprobación/finalización de diseño." })
  }

  // Pedido atrasado
  if (pedido.fecha_comprometida && !["despachado", "cerrado", "cancelado"].includes(estado)) {
    const fechaComp = new Date(pedido.fecha_comprometida)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    if (fechaComp < hoy) {
      const diasAtraso = formatDistanceToNow(fechaComp, { locale: es })
      alertas.push({
        type: "red",
        text: `Pedido atrasado: la fecha comprometida era el ${format(fechaComp, "dd/MM/yyyy")} (hace ${diasAtraso}).`,
      })
    }
  }

  // Tareas vencidas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareasVencidas = pedido.tareas?.filter((t: any) => {
    if (t.estado === "terminada" || !t.fecha_limite) return false
    return new Date(t.fecha_limite) < new Date()
  }).length ?? 0
  if (tareasVencidas > 0) {
    alertas.push({ type: "amber", text: `${tareasVencidas} tarea${tareasVencidas > 1 ? "s" : ""} vencida${tareasVencidas > 1 ? "s" : ""} en este pedido.` })
  }

  // Pendiente de saldo
  if (estado === "pendiente_saldo" && saldo > 0) {
    alertas.push({ type: "red", text: `Pedido armado, saldo pendiente: $${saldo.toLocaleString("es-AR")}. Cobrar para habilitar despacho.` })
  }

  if (alertas.length === 0) return null

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <AlertItem key={i} type={a.type} text={a.text} />
      ))}
    </div>
  )
}
