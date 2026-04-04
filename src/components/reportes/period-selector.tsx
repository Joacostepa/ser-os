"use client"

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

export type Period = "today" | "last_7_days" | "last_30_days" | "last_quarter" | "last_year"

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "last_7_days", label: "Últimos 7 días" },
  { value: "last_30_days", label: "Últimos 30 días" },
  { value: "last_quarter", label: "Último trimestre" },
  { value: "last_year", label: "Último año" },
]

export function getPeriodDates(period: Period): { desde: string; hasta: string } {
  const now = new Date()
  const hasta = now.toISOString()

  switch (period) {
    case "today": {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "last_7_days": {
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "last_30_days": {
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "last_quarter": {
      const start = new Date(now)
      start.setMonth(now.getMonth() - 3)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "last_year": {
      const start = new Date(now.getFullYear(), 0, 1)
      return { desde: start.toISOString(), hasta }
    }
  }
}

export function getPreviousPeriodDates(period: Period): { desde: string; hasta: string } {
  const { desde, hasta } = getPeriodDates(period)
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
}: {
  value: Period
  onChange: (period: Period) => void
}) {
  return (
    <Select value={value} onValueChange={(v: string | null) => v && onChange(v as Period)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIODS.map((p) => (
          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
