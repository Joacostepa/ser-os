import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import {
  PackageOpen,
  Check,
  Clock,
  Truck,
  CircleAlert,
  CircleCheck,
  Package,
  ExternalLink,
  Ban,
  Mail,
  Phone,
  Globe,
} from "lucide-react"
import type { Metadata } from "next"
import type { EstadoInterno, TipoDespacho } from "@/types/database"
import { mapearEstadoCliente } from "@/lib/portal/mapeo-estados"
import { filtrarHistorialCliente } from "@/lib/portal/filtrar-historial"
import { getConfiguracionEmpresa } from "@/lib/portal/config-empresa"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Seguimiento de pedido — SER Mayorista",
  description:
    "Seguí el estado de tu pedido en SER Mayorista en tiempo real.",
  openGraph: {
    title: "Seguimiento de pedido — SER Mayorista",
    description:
      "Seguí el estado de tu pedido en SER Mayorista en tiempo real.",
    type: "website",
  },
}

// ─── Step definitions ─────────────────────────────────────────────
const PASOS = [
  { numero: 1, label: "Recibido" },
  { numero: 2, label: "Confirmado" },
  { numero: 3, label: "Producción" },
  { numero: 4, label: "Preparación" },
  { numero: 5, label: "Listo" },
  { numero: 6, label: "En camino" },
  { numero: 7, label: "Entregado" },
]

// ─── Helper: format date ──────────────────────────────────────────
function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatearFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })
}

// ─── Page ─────────────────────────────────────────────────────────
export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  // ── Query pedido ────────────────────────────────────────────────
  const { data: pedido } = await supabase
    .from("pedidos")
    .select(
      `
      id,
      numero_tn,
      estado_interno,
      estado_publico,
      tipo,
      tipo_despacho,
      datos_envio,
      fecha_comprometida,
      fecha_ingreso,
      monto_total,
      monto_pagado,
      saldo_pendiente,
      observaciones,
      codigo_seguimiento,
      cliente:clientes(nombre),
      items:items_pedido(id, descripcion, cantidad, precio_unitario, subtotal)
    `
    )
    .or(`codigo_seguimiento.eq.${codigo},codigo_seguimiento_portal.eq.${codigo}`)
    .single()

  if (!pedido) {
    notFound()
  }

  // ── Query pagos ─────────────────────────────────────────────────
  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto, concepto, fecha")
    .eq("pedido_id", pedido.id)
    .eq("tipo", "cobro")
    .order("fecha", { ascending: false })

  // ── Query historial ─────────────────────────────────────────────
  const { data: historial } = await supabase
    .from("historial_pedido")
    .select("id, accion, estado_anterior, estado_nuevo, created_at")
    .eq("pedido_id", pedido.id)
    .order("created_at", { ascending: false })

  // ── Derived data ────────────────────────────────────────────────
  const config = getConfiguracionEmpresa()

  const totalPagado = pagos?.reduce((sum, p) => sum + p.monto, 0) ?? 0
  const saldoPendiente = pedido.monto_total - totalPagado

  const estado = mapearEstadoCliente(
    pedido.estado_interno as EstadoInterno,
    (pedido.datos_envio as Record<string, unknown>)?.subestado as
      | string
      | undefined,
    saldoPendiente,
    pedido.tipo_despacho as TipoDespacho | null
  )

  const eventos = filtrarHistorialCliente(historial ?? [], pagos ?? [])

  const tracking = (pedido.datos_envio as Record<string, unknown>)
    ?.tracking as string | undefined
  const correo = (pedido.datos_envio as Record<string, unknown>)?.correo as
    | string
    | undefined
  const urlTracking = (pedido.datos_envio as Record<string, unknown>)
    ?.url_tracking as string | undefined

  const esCancelado = (pedido.estado_interno as string) === "cancelado"

  const clienteRaw = pedido.cliente as
    | { nombre: string }
    | { nombre: string }[]
    | null
  const clienteNombre = Array.isArray(clienteRaw)
    ? clienteRaw[0]?.nombre
    : clienteRaw?.nombre

  const numeroPedido =
    pedido.numero_tn || `#${pedido.id.slice(0, 8).toUpperCase()}`

  const items = (pedido.items as {
    id: string
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]) ?? []

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Portal Header ──────────────────────────────────────── */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-white mb-3">
          <PackageOpen className="h-5 w-5" />
        </div>
        <p className="text-sm text-stone-500 mb-0.5">
          Seguimiento de tu pedido
        </p>
        <h1 className="text-lg font-medium text-stone-900 font-mono">
          {numeroPedido}
        </h1>
        {clienteNombre && (
          <p className="text-sm text-stone-400 mt-1">{clienteNombre}</p>
        )}
      </div>

      {/* ── Progress Tracker ───────────────────────────────────── */}
      {!esCancelado && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            {PASOS.map((paso, index) => {
              const isCompleted = paso.numero < estado.paso
              const isCurrent = paso.numero === estado.paso

              return (
                <div
                  key={paso.numero}
                  className="flex flex-col items-center flex-1 relative"
                >
                  {/* Line before circle */}
                  {index > 0 && (
                    <div
                      className={`absolute top-3 right-1/2 w-full h-0.5 -z-0 ${
                        isCompleted || isCurrent
                          ? "bg-green-500"
                          : "bg-stone-200"
                      }`}
                    />
                  )}

                  {/* Circle */}
                  <div
                    className={`relative z-10 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-blue-600 text-white ring-[3px] ring-blue-100"
                          : "bg-stone-200 text-stone-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-[10px] font-medium">
                        {paso.numero}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={`text-[10px] mt-1.5 text-center leading-tight ${
                      isCompleted
                        ? "text-green-700 font-medium"
                        : isCurrent
                          ? "text-blue-700 font-medium"
                          : "text-stone-400"
                    }`}
                  >
                    {paso.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Estado Actual Card ─────────────────────────────────── */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              esCancelado
                ? "bg-red-50 text-red-500"
                : estado.paso >= 7
                  ? "bg-green-50 text-green-600"
                  : estado.paso >= 5
                    ? "bg-blue-50 text-blue-600"
                    : "bg-stone-100 text-stone-600"
            }`}
          >
            {esCancelado ? (
              <Ban className="h-4.5 w-4.5" />
            ) : estado.paso >= 7 ? (
              <CircleCheck className="h-4.5 w-4.5" />
            ) : estado.paso === 6 ? (
              <Truck className="h-4.5 w-4.5" />
            ) : (
              <Package className="h-4.5 w-4.5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-900">
              {estado.label}
            </p>
            <p className="text-sm text-stone-500 mt-0.5">{estado.mensaje}</p>
            {pedido.fecha_comprometida && !esCancelado && estado.paso < 7 && (
              <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Fecha estimada:{" "}
                {formatearFecha(pedido.fecha_comprometida)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Saldo Pendiente Card ───────────────────────────────── */}
      {estado.mostrarPagoPendiente && saldoPendiente > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CircleAlert className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">
              Pago pendiente
            </p>
          </div>

          <p className="text-2xl font-mono font-medium text-amber-900 mb-4">
            ${saldoPendiente.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          <div className="space-y-2 text-sm text-amber-800">
            <div className="flex justify-between">
              <span className="text-amber-600">CBU</span>
              <span className="font-mono text-xs">{config.cbu}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600">Alias</span>
              <span className="font-mono text-xs">{config.alias}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600">Titular</span>
              <span className="text-xs">{config.titular}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600">CUIT</span>
              <span className="font-mono text-xs">{config.cuit}</span>
            </div>
          </div>

          <p className="text-xs text-amber-600 mt-4">
            Una vez realizado el pago, envianos el comprobante a{" "}
            <a
              href={`mailto:${config.emailPagos}`}
              className="underline underline-offset-2 font-medium"
            >
              {config.emailPagos}
            </a>
          </p>
        </div>
      )}

      {/* ── Datos Envio Card ───────────────────────────────────── */}
      {(pedido.estado_interno as string) === "despachado" && tracking && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-green-700" />
            <p className="text-sm font-medium text-green-900">
              Datos de envio
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">Tracking</span>
              <span className="font-mono text-xs text-green-900">
                {tracking}
              </span>
            </div>
            {correo && (
              <div className="flex justify-between">
                <span className="text-green-600">Transporte</span>
                <span className="text-xs text-green-900">{correo}</span>
              </div>
            )}
          </div>

          {urlTracking && (
            <a
              href={urlTracking}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white text-sm font-medium py-2.5 hover:bg-green-700 transition-colors"
            >
              Seguir mi envio
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ── Detalle Items Card ─────────────────────────────────── */}
      {items.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-sm font-medium text-stone-900 mb-3">
            Detalle del pedido
          </p>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-stone-700 truncate">
                    {item.descripcion}
                  </p>
                  <p className="text-xs text-stone-400">
                    {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"} x{" "}
                    <span className="font-mono">
                      ${item.precio_unitario.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                </div>
                <p className="text-sm font-mono text-stone-900 shrink-0">
                  ${item.subtotal.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-stone-100 mt-4 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Total</span>
              <span className="font-mono font-medium text-stone-900">
                ${pedido.monto_total.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {totalPagado > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Pagado</span>
                <span className="font-mono text-green-600">
                  -${totalPagado.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {saldoPendiente > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Saldo</span>
                <span className="font-mono font-medium text-amber-600">
                  ${saldoPendiente.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Historial Cliente Card ─────────────────────────────── */}
      {eventos.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-sm font-medium text-stone-900 mb-3">Historial</p>

          <div className="space-y-3">
            {eventos.map((evento, index) => (
              <div key={`${evento.fecha}-${index}`} className="flex gap-3">
                {/* Dot + line */}
                <div className="flex flex-col items-center pt-1.5">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      evento.esActual ? "bg-blue-600" : "bg-stone-300"
                    }`}
                  />
                  {index < eventos.length - 1 && (
                    <div className="w-px flex-1 bg-stone-200 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-2 min-w-0">
                  <p
                    className={`text-sm ${
                      evento.esActual
                        ? "text-stone-900 font-medium"
                        : "text-stone-600"
                    }`}
                  >
                    {evento.texto}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {formatearFechaCorta(evento.fecha)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Contacto Footer ────────────────────────────────────── */}
      <div className="text-center space-y-2 pt-2 pb-4">
        <p className="text-xs text-stone-400">{config.nombre}</p>
        <div className="flex items-center justify-center gap-4 text-xs text-stone-400">
          <a
            href={`mailto:${config.emailContacto}`}
            className="flex items-center gap-1 hover:text-stone-600 transition-colors"
          >
            <Mail className="h-3 w-3" />
            {config.emailContacto}
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-stone-400">
          <a
            href={`tel:${config.telefono}`}
            className="flex items-center gap-1 hover:text-stone-600 transition-colors"
          >
            <Phone className="h-3 w-3" />
            {config.telefono}
          </a>
          <a
            href={config.urlTienda}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-stone-600 transition-colors"
          >
            <Globe className="h-3 w-3" />
            sermayorista.com
          </a>
        </div>
      </div>
    </div>
  )
}
