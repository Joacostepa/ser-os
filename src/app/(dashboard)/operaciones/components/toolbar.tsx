"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, List, LayoutGrid } from "lucide-react"

const ESTADOS = [
  { value: "todos", label: "Todos los estados" },
  { value: "nuevo", label: "Nuevo" },
  { value: "pendiente_sena", label: "Pendiente de seña" },
  { value: "sena_recibida", label: "Seña recibida" },
  { value: "en_prearmado", label: "En pre-armado" },
  { value: "esperando_insumos", label: "Esperando insumos" },
  { value: "listo_para_armar", label: "Listo para armar" },
  { value: "en_armado", label: "En armado" },
  { value: "armado_completo", label: "Armado completo" },
  { value: "pendiente_saldo", label: "Pendiente de cobro" },
  { value: "listo_para_despacho", label: "Listo para despachar" },
]

export type Vista = "kanban" | "lista"

interface ToolbarProps {
  busqueda: string
  onBusquedaChange: (v: string) => void
  estado: string
  onEstadoChange: (v: string) => void
  tipo: string
  onTipoChange: (v: string) => void
  prioridad: string
  onPrioridadChange: (v: string) => void
  vista: Vista
  onVistaChange: (v: Vista) => void
}

export function Toolbar({
  busqueda, onBusquedaChange,
  estado, onEstadoChange,
  tipo, onTipoChange,
  prioridad, onPrioridadChange,
  vista, onVistaChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" strokeWidth={1.5} />
        <Input
          placeholder="Buscar por # pedido o cliente..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="pl-8 text-sm border-stone-200 bg-white"
        />
      </div>

      <Select value={estado} onValueChange={(v: string | null) => onEstadoChange(v || "todos")}>
        <SelectTrigger className="w-[170px] text-sm border-stone-200 bg-white">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={tipo} onValueChange={(v: string | null) => onTipoChange(v || "todos")}>
        <SelectTrigger className="w-[130px] text-sm border-stone-200 bg-white">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="estandar">Estándar</SelectItem>
          <SelectItem value="personalizado">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={prioridad} onValueChange={(v: string | null) => onPrioridadChange(v || "todos")}>
        <SelectTrigger className="w-[130px] text-sm border-stone-200 bg-white">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
          <SelectItem value="baja">Baja</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex rounded-lg border border-stone-200 overflow-hidden">
        <button
          onClick={() => onVistaChange("kanban")}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors ${
            vista === "kanban" ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
          Kanban
        </button>
        <button
          onClick={() => onVistaChange("lista")}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors border-l border-stone-200 ${
            vista === "lista" ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <List className="h-4 w-4" strokeWidth={1.5} />
          Lista
        </button>
      </div>
    </div>
  )
}
