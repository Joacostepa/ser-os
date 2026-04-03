import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { PackageOpen, Check } from "lucide-react"
import type { EstadoPublico } from "@/types/database"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Seguimiento de pedido — SER Mayorista",
}

const PASOS: { estado: EstadoPublico; label: string }[] = [
  { estado: "recibido", label: "Recibido" },
  { estado: "en_produccion", label: "En producción" },
  { estado: "en_preparacion", label: "En preparación" },
  { estado: "listo_para_envio", label: "Listo para envío" },
  { estado: "enviado", label: "Enviado" },
  { estado: "entregado", label: "Entregado" },
]

const MENSAJES: Partial<Record<EstadoPublico, string>> = {
  recibido: "Tu pedido fue recibido y está siendo procesado por nuestro equipo.",
  en_produccion: "Tu pedido está en producción. Estamos preparando todo para vos.",
  en_diseno: "Tu pedido personalizado está siendo diseñado por nuestro equipo.",
  en_preparacion: "Tu pedido está siendo preparado para el envío.",
  listo_pendiente_pago: "Tu pedido está listo. Para continuar, necesitamos que completes el pago del saldo.",
  listo_para_envio: "¡Tu pedido está listo! Te avisamos apenas lo despachemos.",
  enviado: "Tu pedido fue despachado.",
  entregado: "¡Tu pedido fue entregado! Gracias por tu compra.",
}

export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const cookieStore = await cookies()

  // Use anon key directly — this is a public page
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

  const { data: pedido } = await supabase
    .from("pedidos")
    .select(`
      id, numero_tn, estado_publico, tipo, tipo_despacho, datos_envio, fecha_comprometida,
      cliente:clientes(nombre)
    `)
    .eq("codigo_seguimiento", codigo)
    .single()

  if (!pedido) {
    notFound()
  }

  const estadoActual = pedido.estado_publico as EstadoPublico
  const currentIndex = PASOS.findIndex((p) => p.estado === estadoActual)
  const mensaje = MENSAJES[estadoActual] || "Tu pedido está siendo procesado."

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracking = (pedido.datos_envio as any)?.tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const correo = (pedido.datos_envio as any)?.correo

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-3">
            <PackageOpen className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">SER Mayorista</h1>
          <p className="text-sm text-muted-foreground mt-1">Seguimiento de pedido</p>
        </div>

        {/* Pedido info */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Pedido</p>
              <p className="font-bold text-lg">
                {pedido.numero_tn || `#${pedido.id.slice(0, 8)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Cliente</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <p className="font-medium">{(pedido.cliente as any)?.nombre}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="space-y-0">
            {PASOS.map((paso, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isPending = index > currentIndex

              return (
                <div key={paso.estado} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    {index < PASOS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${
                          isCompleted ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-1">
                    <p
                      className={`text-sm font-medium ${
                        isPending ? "text-gray-400" : ""
                      }`}
                    >
                      {paso.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status message */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <p className="text-sm">{mensaje}</p>

          {estadoActual === "listo_pendiente_pago" && (
            <p className="text-sm mt-2 text-amber-600 font-medium">
              Contactanos para coordinar el pago.
            </p>
          )}
        </div>

        {/* Tracking info */}
        {estadoActual === "enviado" && tracking && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Número de seguimiento</p>
            <p className="font-mono font-bold">{tracking}</p>
            {correo && (
              <p className="text-sm text-muted-foreground mt-1">
                Enviado por: {correo}
              </p>
            )}
          </div>
        )}

        {/* Retiro en oficina */}
        {pedido.tipo_despacho === "retiro_oficina" && estadoActual === "listo_para_envio" && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <p className="text-sm font-medium">Tu pedido está listo para retirar</p>
            <p className="text-sm text-muted-foreground mt-1">
              Coordiná el retiro por nuestros canales de contacto.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground mt-8">
          <p>SER Mayorista &mdash; Sistema de Gestión</p>
        </div>
      </div>
    </div>
  )
}
