"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TIPO_PEDIDO_OPTIONS } from "@/lib/config/tipos"

interface TipoSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function TipoSelect({ value, onChange, disabled }: TipoSelectProps) {
  const selected = TIPO_PEDIDO_OPTIONS.find((o) => o.value === value)

  return (
    <Select
      value={value}
      onValueChange={(v: string | null) => v && onChange(v)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue>
          {selected ? (
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${selected.bg} ring-1 ring-inset ring-stone-200`} />
              <span className={`text-sm ${selected.text}`}>{selected.label}</span>
            </span>
          ) : (
            "Seleccionar tipo"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TIPO_PEDIDO_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${option.bg} ${option.text}`}>
                {option.label}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
