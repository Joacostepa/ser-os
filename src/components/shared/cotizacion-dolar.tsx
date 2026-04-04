"use client"

import { useEffect, useState } from "react"
import type { Cotizacion } from "@/lib/dolar-api"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function CotizacionDolar() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])

  useEffect(() => {
    async function fetchCotizaciones() {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares")
        if (res.ok) {
          const data = await res.json()
          setCotizaciones(data)
        }
      } catch {
        // Silently fail
      }
    }

    fetchCotizaciones()
    const interval = setInterval(fetchCotizaciones, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const blue = cotizaciones.find((c) => c.casa === "blue")
  const oficial = cotizaciones.find((c) => c.casa === "oficial")
  const mep = cotizaciones.find((c) => c.casa === "bolsa")
  const ccl = cotizaciones.find((c) => c.casa === "contadoconliqui")

  if (!blue) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono cursor-default" />}
        >
          <span className="text-green-600">$</span>
          <span>Blue {blue.venta.toLocaleString("es-AR")}</span>
          <span className="text-stone-300">|</span>
          <span>Oficial {oficial?.venta.toLocaleString("es-AR") || "—"}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs space-y-1">
          <p className="font-medium text-stone-700 mb-1">Cotizaciones USD</p>
          {blue && <p className="text-stone-600">Blue: ${blue.compra.toLocaleString("es-AR")} / ${blue.venta.toLocaleString("es-AR")}</p>}
          {oficial && <p className="text-stone-600">Oficial: ${oficial.compra.toLocaleString("es-AR")} / ${oficial.venta.toLocaleString("es-AR")}</p>}
          {mep && <p className="text-stone-600">MEP: ${mep.compra.toLocaleString("es-AR")} / ${mep.venta.toLocaleString("es-AR")}</p>}
          {ccl && <p className="text-stone-600">CCL: ${ccl.compra.toLocaleString("es-AR")} / ${ccl.venta.toLocaleString("es-AR")}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
