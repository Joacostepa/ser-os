"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { clasificarPedido } from "@/lib/pedidos/clasificar-pedido"

interface ClasificacionBannerProps {
  pedidoId: string
  onClassify: (tipo: string) => void
}

const BUTTONS = [
  { tipo: "logo_ser", label: "Logo SER", bg: "bg-blue-50 hover:bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { tipo: "marca_blanca", label: "Marca blanca", bg: "bg-stone-100 hover:bg-stone-200", text: "text-stone-700", border: "border-stone-300" },
  { tipo: "personalizado", label: "Personalizado", bg: "bg-violet-50 hover:bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
] as const

export function ClasificacionBanner({ pedidoId, onClassify }: ClasificacionBannerProps) {
  const [loadingTipo, setLoadingTipo] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  async function handleClassify(tipo: string) {
    setLoadingTipo(tipo)
    try {
      const result = await clasificarPedido(pedidoId, tipo)
      const tipoLabel = BUTTONS.find((b) => b.tipo === tipo)?.label ?? tipo
      if (result.autoHabilitado) {
        toast.success(`Clasificado como ${tipoLabel} y habilitado`)
      } else {
        toast.success(`Clasificado como ${tipoLabel}`)
      }
      setHidden(true)
      setTimeout(() => onClassify(tipo), 300)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al clasificar")
    } finally {
      setLoadingTipo(null)
    }
  }

  return (
    <div
      className={`bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3 flex-wrap transition-all duration-300 overflow-hidden ${
        hidden ? "opacity-0 max-h-0 py-0 border-0" : "opacity-100 max-h-40"
      }`}
    >
      <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mr-auto">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Este pedido necesita clasificacion</span>
      </div>
      <div className="flex items-center gap-2">
        {BUTTONS.map((btn) => (
          <button
            key={btn.tipo}
            onClick={() => handleClassify(btn.tipo)}
            disabled={loadingTipo !== null}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-md border ${btn.bg} ${btn.text} ${btn.border} transition-colors disabled:opacity-50 disabled:cursor-wait`}
          >
            {loadingTipo === btn.tipo ? "..." : btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
