"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { ESTADOS_INTERNOS, PRIORIDAD_CONFIG } from "@/lib/constants"
import type { EstadoInterno, Prioridad } from "@/types/database"

interface PedidosFiltersProps {
  busqueda: string
  estado: string
  tipo: string
  prioridad: string
  onBusquedaChange: (v: string) => void
  onEstadoChange: (v: string | null) => void
  onTipoChange: (v: string | null) => void
  onPrioridadChange: (v: string | null) => void
  onClear: () => void
}

export function PedidosFilters({
  busqueda,
  estado,
  tipo,
  prioridad,
  onBusquedaChange,
  onEstadoChange,
  onTipoChange,
  onPrioridadChange,
  onClear,
}: PedidosFiltersProps) {
  const hasFilters = busqueda || estado || tipo || prioridad

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por # pedido o cliente..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select value={estado} onValueChange={onEstadoChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          {Object.entries(ESTADOS_INTERNOS).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tipo} onValueChange={onTipoChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los tipos</SelectItem>
          <SelectItem value="estandar">Estándar</SelectItem>
          <SelectItem value="personalizado">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={prioridad} onValueChange={onPrioridadChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          {Object.entries(PRIORIDAD_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
