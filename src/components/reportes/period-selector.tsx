"use client"

import { useState } from "react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export type Period = "hoy" | "ayer" | "ultimos_7" | "ultimos_30" | "este_mes" | "mes_anterior" | "ultimos_90" | "este_anio" | "personalizado"

const PERIODS: { value: Period; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "ultimos_7", label: "Últimos 7 días" },
  { value: "ultimos_30", label: "Últimos 30 días" },
  { value: "este_mes", label: "Este mes" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "ultimos_90", label: "Últimos 90 días" },
  { value: "este_anio", label: "Este año" },
  { value: "personalizado", label: "Personalizado..." },
]

export function getPeriodDates(period: Period, customDesde?: string, customHasta?: string): { desde: string; hasta: string } {
  const now = new Date()
  const hasta = now.toISOString()

  switch (period) {
    case "hoy": {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "ayer": {
      const start = new Date(now)
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta: end.toISOString() }
    }
    case "ultimos_7": {
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "ultimos_30": {
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "este_mes": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { desde: start.toISOString(), hasta }
    }
    case "mes_anterior": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 1)
      return { desde: start.toISOString(), hasta: end.toISOString() }
    }
    case "ultimos_90": {
      const start = new Date(now)
      start.setDate(now.getDate() - 90)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "este_anio": {
      const start = new Date(now.getFullYear(), 0, 1)
      return { desde: start.toISOString(), hasta }
    }
    case "personalizado": {
      if (customDesde && customHasta) {
        return {
          desde: new Date(customDesde).toISOString(),
          hasta: new Date(customHasta + "T23:59:59").toISOString(),
        }
      }
      // Fallback: últimos 30 días
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
  }
}

export function getPreviousPeriodDates(period: Period, customDesde?: string, customHasta?: string): { desde: string; hasta: string } {
  const { desde, hasta } = getPeriodDates(period, customDesde, customHasta)
  const desdeDt = new Date(desde)
  const hastaDt = new Date(hasta)
  const duracionMs = hastaDt.getTime() - desdeDt.getTime()
  return {
    desde: new Date(desdeDt.getTime() - duracionMs).toISOString(),
    hasta: desde,
  }
}

export function PeriodSelector({
  value,
  onChange,
  customDesde,
  customHasta,
  onCustomChange,
}: {
  value: Period
  onChange: (period: Period) => void
  customDesde?: string
  customHasta?: string
  onCustomChange?: (desde: string, hasta: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v: string | null) => v && onChange(v as Period)}>
        <SelectTrigger className="w-[180px] text-sm text-stone-600 border-stone-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value === "personalizado" && onCustomChange && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={customDesde || ""}
            onChange={(e) => onCustomChange(e.target.value, customHasta || "")}
            className="w-[140px] text-sm"
          />
          <span className="text-stone-400 text-xs">—</span>
          <Input
            type="date"
            value={customHasta || ""}
            onChange={(e) => onCustomChange(customDesde || "", e.target.value)}
            className="w-[140px] text-sm"
          />
        </div>
      )}
    </div>
  )
}
