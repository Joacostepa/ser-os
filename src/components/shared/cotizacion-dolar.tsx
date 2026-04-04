"use client"

import { useEffect, useState } from "react"
import { DollarSign } from "lucide-react"
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
        // Silently fail — not critical
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
  const cripto = cotizaciones.find((c) => c.casa === "cripto")

  if (!blue) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs tabular-nums cursor-default" />}
        >
          <DollarSign className="h-3 w-3 text-green-600" />
          <span className="font-medium">Blue</span>
          <span>${blue.venta.toLocaleString("es-AR")}</span>
          <span className="text-muted-foreground">|</span>
          <span className="font-medium">Oficial</span>
          <span>${oficial?.venta.toLocaleString("es-AR") || "—"}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs space-y-1">
          <p className="font-medium mb-1">Cotizaciones USD</p>
          {blue && <p>Blue: ${blue.compra.toLocaleString("es-AR")} / ${blue.venta.toLocaleString("es-AR")}</p>}
          {oficial && <p>Oficial: ${oficial.compra.toLocaleString("es-AR")} / ${oficial.venta.toLocaleString("es-AR")}</p>}
          {mep && <p>MEP: ${mep.compra.toLocaleString("es-AR")} / ${mep.venta.toLocaleString("es-AR")}</p>}
          {ccl && <p>CCL: ${ccl.compra.toLocaleString("es-AR")} / ${ccl.venta.toLocaleString("es-AR")}</p>}
          {cripto && <p>Cripto: ${cripto.compra.toLocaleString("es-AR")} / ${cripto.venta.toLocaleString("es-AR")}</p>}
          <p className="text-muted-foreground pt-1">
            Actualizado: {blue.fechaActualizacion ? new Date(blue.fechaActualizacion).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
