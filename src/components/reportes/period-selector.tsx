"use client"

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

export type Period = "this_week" | "this_month" | "last_month" | "last_3_months" | "this_year"

const PERIODS: { value: Period; label: string }[] = [
  { value: "this_week", label: "Esta semana" },
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Último mes" },
  { value: "last_3_months", label: "Últimos 3 meses" },
  { value: "this_year", label: "Este año" },
]

export function getPeriodDates(period: Period): { desde: string; hasta: string } {
  const now = new Date()
  const hasta = now.toISOString()

  switch (period) {
    case "this_week": {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      return { desde: start.toISOString(), hasta }
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { desde: start.toISOString(), hasta }
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      return { desde: start.toISOString(), hasta: end.toISOString() }
    }
    case "last_3_months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      return { desde: start.toISOString(), hasta }
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1)
      return { desde: start.toISOString(), hasta }
    }
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
