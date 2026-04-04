import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { ESTADOS_INTERNOS } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"

const ESTADO_PAGO_BADGE = {
  pagado: { label: "Pagado", className: "bg-[#EAF3DE] text-[#3B6D11] border-0" },
  parcial: { label: "Pago parcial", className: "bg-[#FAEEDA] text-[#854F0B] border-0" },
  sin_pago: { label: "Sin pago", className: "bg-[#FCEBEB] text-[#A32D2D] border-0" },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OrderHeader({ pedido, onAvanzarEstado }: { pedido: any; onAvanzarEstado: () => void }) {
  const estadoConfig = ESTADOS_INTERNOS[pedido.estado_interno as EstadoInterno]

  const saldo = Number(pedido.saldo_pendiente || 0)
  const montoPagado = Number(pedido.monto_pagado || 0)
  const montoTotal = Number(pedido.monto_total || 0)
  const estadoPago = saldo <= 0 ? "pagado" : montoPagado > 0 ? "parcial" : "sin_pago"
  const pagoConfig = ESTADO_PAGO_BADGE[estadoPago]

  const diasDesdeIngreso = pedido.fecha_ingreso
    ? formatDistanceToNow(new Date(pedido.fecha_ingreso), { locale: es, addSuffix: false })
    : null

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <Link href="/pedidos">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-medium">
              Pedido #{pedido.numero_tn || pedido.id.slice(0, 8)}
            </h1>
            <Badge variant="secondary" className={pedido.tipo === "personalizado" ? "bg-[#EEEDFE] text-[#534AB7] border-0" : "bg-[#E6F1FB] text-[#185FA5] border-0"}>
              {pedido.tipo === "personalizado" ? "Personalizado" : "Estándar"}
            </Badge>
            <Badge variant="secondary" className={estadoConfig?.bgColor}>
              {estadoConfig?.label}
            </Badge>
            <Badge variant="secondary" className={pagoConfig.className}>
              {pagoConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {pedido.cliente?.nombre}
            {diasDesdeIngreso && <> · Ingresado hace {diasDesdeIngreso}</>}
            {pedido.fecha_comprometida && (
              <> · Entrega: {format(new Date(pedido.fecha_comprometida), "dd MMM yyyy", { locale: es })}</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {pedido.tienda_nube_id && pedido.tienda?.tienda_nube_store_id && (
          <a
            href={`https://${pedido.tienda.tienda_nube_store_id}.mitiendanube.com/admin/orders/${pedido.tienda_nube_id}`}
            target="_blank" rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver en TN
            </Button>
          </a>
        )}
        <Button size="sm" onClick={onAvanzarEstado}>
          Avanzar estado
        </Button>
      </div>
    </div>
  )
}
