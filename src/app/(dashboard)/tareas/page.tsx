"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Lock,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react"
import {
  completarTarea,
  iniciarTarea,
  toggleSubtarea,
  crearTareaLibre,
  eliminarTarea,
} from "@/lib/actions/tareas"
import { toast } from "sonner"
import Link from "next/link"
import {
  format,
  formatDistanceToNow,
  isToday,
  isBefore,
  startOfDay,
  differenceInDays,
} from "date-fns"
import { es } from "date-fns/locale"

// ─── Types ──────────────────────────────────────────────────────
type Tab = "mis_tareas" | "equipo" | "vencidas" | "todas"

interface Subtarea {
  id: string
  titulo: string
  completada: boolean
  orden: number
}

interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  estado: "pendiente" | "en_proceso" | "terminada" | "bloqueada"
  responsable_id: string | null
  area: string
  orden: number
  fecha_limite: string | null
  depende_de: string[]
  completada_por: string | null
  completada_en: string | null
  created_at: string
  pedido_id: string | null
  fase: string | null
  prioridad: string
  fecha_inicio: string | null
  pedido: { id: string; numero_tn: string | null; cliente: { nombre: string } | null } | null
  responsable: { id: string; nombre: string } | null
  subtareas: Subtarea[]
}

interface Usuario {
  id: string
  nombre: string
}

interface PedidoOption {
  id: string
  numero_tn: string | null
  cliente: { nombre: string } | null
}

// ─── Constants ──────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: "mis_tareas", label: "Mis tareas" },
  { key: "equipo", label: "Equipo" },
  { key: "vencidas", label: "Vencidas" },
  { key: "todas", label: "Todas" },
]

const ESTADO_CONFIG = {
  pendiente: { bg: "bg-stone-100 text-stone-600", label: "Pendiente" },
  en_proceso: { bg: "bg-blue-50 text-blue-700", label: "En proceso" },
  terminada: { bg: "bg-green-50 text-green-700", label: "Terminada" },
  bloqueada: { bg: "bg-red-50 text-red-700", label: "Bloqueada" },
}

const PRIORIDAD_CONFIG: Record<string, { dot: string; text: string; label: string }> = {
  urgente: { dot: "bg-red-500", text: "text-red-600", label: "Urgente" },
  alta: { dot: "bg-amber-500", text: "text-amber-600", label: "Alta" },
  normal: { dot: "bg-stone-300", text: "text-stone-400", label: "Normal" },
  baja: { dot: "bg-stone-200", text: "text-stone-300", label: "Baja" },
}

const AREA_OPTIONS = [
  { value: "diseno", label: "Diseno" },
  { value: "operaciones", label: "Operaciones" },
  { value: "armado", label: "Armado" },
  { value: "logistica", label: "Logistica" },
  { value: "admin", label: "Admin" },
]

const TAREA_SELECT = `
  *,
  pedido:pedidos(id, numero_tn, cliente:clientes(nombre)),
  responsable:usuarios(id, nombre),
  subtareas(id, titulo, completada, orden)
`

// ─── Helpers ────────────────────────────────────────────────────
function fechaLimiteDisplay(fecha: string | null) {
  if (!fecha) return null
  const d = new Date(fecha)
  const hoy = startOfDay(new Date())

  if (isBefore(d, hoy) && !isToday(d)) {
    return {
      text: formatDistanceToNow(d, { locale: es, addSuffix: true }),
      color: "text-red-600",
    }
  }
  if (isToday(d)) {
    return { text: "Hoy", color: "text-amber-600" }
  }
  return {
    text: format(d, "d MMM", { locale: es }),
    color: "text-stone-500",
  }
}

function groupByResponsable(tareas: Tarea[]) {
  const groups: Record<string, { nombre: string; tareas: Tarea[] }> = {}
  for (const t of tareas) {
    const key = t.responsable?.id || "sin_asignar"
    const nombre = t.responsable?.nombre || "Sin asignar"
    if (!groups[key]) groups[key] = { nombre, tareas: [] }
    groups[key].tareas.push(t)
  }
  return Object.values(groups)
}

function groupByOverdue(tareas: Tarea[]) {
  const groups: Record<string, Tarea[]> = {}
  const hoy = startOfDay(new Date())
  for (const t of tareas) {
    if (!t.fecha_limite) {
      const key = "Sin fecha"
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
      continue
    }
    const dias = differenceInDays(hoy, new Date(t.fecha_limite))
    const key = dias === 0 ? "Hoy" : dias === 1 ? "Hace 1 dia" : `Hace ${dias} dias`
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return groups
}

function groupMisTareas(tareas: Tarea[]) {
  const vencidas: Tarea[] = []
  const hoy: Tarea[] = []
  const proximas: Tarea[] = []
  const sinFecha: Tarea[] = []

  const ahora = startOfDay(new Date())

  for (const t of tareas) {
    if (!t.fecha_limite) {
      sinFecha.push(t)
    } else {
      const d = new Date(t.fecha_limite)
      if (isBefore(d, ahora) && !isToday(d)) {
        vencidas.push(t)
      } else if (isToday(d)) {
        hoy.push(t)
      } else {
        proximas.push(t)
      }
    }
  }

  return { vencidas, hoy, proximas, sinFecha }
}

// ─── PriorityDot ────────────────────────────────────────────────
function PriorityDot({ prioridad }: { prioridad: string }) {
  const cfg = PRIORIDAD_CONFIG[prioridad]
  if (!cfg || prioridad === "normal" || prioridad === "baja") return null
  return <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
}

// ─── TaskCheckbox ───────────────────────────────────────────────
function TaskCheckbox({
  estado,
  onComplete,
}: {
  estado: string
  onComplete: () => void
}) {
  if (estado === "bloqueada") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded border border-red-300 bg-red-50">
        <Lock className="h-3 w-3 text-red-400" />
      </div>
    )
  }
  if (estado === "terminada") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded border border-green-400 bg-green-100">
        <Check className="h-3 w-3 text-green-600" />
      </div>
    )
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onComplete()
      }}
      className="flex h-5 w-5 items-center justify-center rounded border border-stone-300 bg-white transition-colors hover:border-stone-400 hover:bg-stone-50"
    />
  )
}

// ─── TaskRow ────────────────────────────────────────────────────
function TaskRow({
  tarea,
  onComplete,
  onStart,
  onToggleSub,
  onDelete,
  showResponsable = false,
  allTareas = [],
}: {
  tarea: Tarea
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onToggleSub: (id: string) => void
  onDelete: (id: string) => void
  showResponsable?: boolean
  allTareas?: Tarea[]
}) {
  const [expanded, setExpanded] = useState(false)
  const fecha = fechaLimiteDisplay(tarea.fecha_limite)
  const hasSubtareas = tarea.subtareas && tarea.subtareas.length > 0
  const completedSubs = tarea.subtareas?.filter((s) => s.completada).length || 0
  const totalSubs = tarea.subtareas?.length || 0

  // Find dependency titles
  const dependeTitulos =
    tarea.estado === "bloqueada" && tarea.depende_de?.length > 0
      ? tarea.depende_de
          .map((depId) => allTareas.find((t) => t.id === depId)?.titulo)
          .filter(Boolean)
      : []

  return (
    <div className="group">
      <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-stone-50">
        <div className="mt-0.5">
          <TaskCheckbox
            estado={tarea.estado}
            onComplete={() => onComplete(tarea.id)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {hasSubtareas && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="shrink-0 text-stone-400 hover:text-stone-600"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <span
              className={`text-sm ${
                tarea.estado === "terminada"
                  ? "text-stone-400 line-through"
                  : tarea.estado === "bloqueada"
                    ? "text-stone-400"
                    : "text-stone-900"
              }`}
            >
              {tarea.titulo}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            {tarea.fase && (
              <span className="text-stone-400">{tarea.fase}</span>
            )}
            <PriorityDot prioridad={tarea.prioridad} />
            {tarea.prioridad && tarea.prioridad !== "normal" && (
              <span className={PRIORIDAD_CONFIG[tarea.prioridad]?.text || "text-stone-400"}>
                {PRIORIDAD_CONFIG[tarea.prioridad]?.label}
              </span>
            )}
            {tarea.pedido && (
              <Link
                href={`/pedidos/${tarea.pedido.id}`}
                className="font-mono text-stone-500 hover:text-stone-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                #{tarea.pedido.numero_tn || tarea.pedido.id.slice(0, 8)}
                {tarea.pedido.cliente ? ` - ${tarea.pedido.cliente.nombre}` : ""}
              </Link>
            )}
            {hasSubtareas && (
              <span className="text-stone-400">
                {completedSubs}/{totalSubs} subtareas
              </span>
            )}
            {showResponsable && tarea.responsable && (
              <span className="text-stone-400">{tarea.responsable.nombre}</span>
            )}
          </div>

          {dependeTitulos.length > 0 && (
            <p className="mt-1 text-xs italic text-amber-600">
              Depende de: {dependeTitulos.join(", ")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {fecha && (
            <span className={`text-xs ${fecha.color}`}>{fecha.text}</span>
          )}
          {tarea.estado === "pendiente" && (
            <Button
              variant="ghost"
              size="xs"
              className="hidden text-stone-400 hover:text-blue-600 group-hover:inline-flex"
              onClick={(e) => {
                e.stopPropagation()
                onStart(tarea.id)
              }}
            >
              Iniciar
            </Button>
          )}
          {!tarea.pedido_id && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="hidden text-stone-300 hover:text-red-500 group-hover:inline-flex"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(tarea.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Subtareas expanded */}
      {expanded && hasSubtareas && (
        <div className="ml-11 border-l border-stone-100 pl-3 pb-1">
          {tarea.subtareas
            .sort((a, b) => a.orden - b.orden)
            .map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 py-1"
              >
                <button
                  onClick={() => onToggleSub(sub.id)}
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    sub.completada
                      ? "border-green-400 bg-green-100"
                      : "border-stone-300 hover:border-stone-400"
                  }`}
                >
                  {sub.completada && <Check className="h-2.5 w-2.5 text-green-600" />}
                </button>
                <span
                  className={`text-xs ${
                    sub.completada ? "text-stone-400 line-through" : "text-stone-600"
                  }`}
                >
                  {sub.titulo}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── GroupHeader ─────────────────────────────────────────────────
function GroupHeader({
  title,
  count,
  className = "",
}: {
  title: string
  count: number
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
      <span className="text-xs font-medium text-stone-500">{title}</span>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        {count}
      </Badge>
    </div>
  )
}

// ─── NuevaTareaModal ────────────────────────────────────────────
function NuevaTareaModal({
  open,
  onOpenChange,
  usuarios,
  pedidos,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  usuarios: Usuario[]
  pedidos: PedidoOption[]
  onCreated: () => void
}) {
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [responsableId, setResponsableId] = useState("")
  const [area, setArea] = useState("operaciones")
  const [prioridad, setPrioridad] = useState("normal")
  const [fechaLimite, setFechaLimite] = useState("")
  const [pedidoId, setPedidoId] = useState("")
  const [subtareaInputs, setSubtareaInputs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setTitulo("")
    setDescripcion("")
    setResponsableId("")
    setArea("operaciones")
    setPrioridad("normal")
    setFechaLimite("")
    setPedidoId("")
    setSubtareaInputs([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error("El titulo es requerido")
      return
    }

    setSubmitting(true)
    try {
      await crearTareaLibre({
        titulo: titulo.trim(),
        descripcion: descripcion || undefined,
        responsable_id: responsableId || undefined,
        area: area || undefined,
        prioridad: prioridad || undefined,
        fecha_limite: fechaLimite || undefined,
        pedido_id: pedidoId || undefined,
        subtareas: subtareaInputs.filter((s) => s.trim() !== ""),
      })
      toast.success("Tarea creada")
      resetForm()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear tarea"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titulo *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nombre de la tarea"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descripcion</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripcion opcional"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Asignar a</Label>
              <Select
                value={responsableId}
                onValueChange={(v: string | null) => v && setResponsableId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Select
                value={area}
                onValueChange={(v: string | null) => v && setArea(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select
                value={prioridad}
                onValueChange={(v: string | null) => v && setPrioridad(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha limite</Label>
              <Input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Vincular a pedido</Label>
            <Select
              value={pedidoId}
              onValueChange={(v: string | null) => v && setPedidoId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin pedido" />
              </SelectTrigger>
              <SelectContent>
                {pedidos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono">
                      #{p.numero_tn || p.id.slice(0, 8)}
                    </span>
                    {p.cliente && (
                      <span className="ml-1 text-stone-500">
                        {p.cliente.nombre}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subtareas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Subtareas</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSubtareaInputs([...subtareaInputs, ""])}
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>
            {subtareaInputs.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={val}
                  onChange={(e) => {
                    const next = [...subtareaInputs]
                    next[idx] = e.target.value
                    setSubtareaInputs(next)
                  }}
                  placeholder={`Subtarea ${idx + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setSubtareaInputs(subtareaInputs.filter((_, i) => i !== idx))
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab: Mis Tareas ────────────────────────────────────────────
function MisTareasTab({
  tareas,
  loading,
  handlers,
}: {
  tareas: Tarea[]
  loading: boolean
  handlers: TaskHandlers
}) {
  if (loading) return <LoadingSkeleton />
  if (tareas.length === 0) return <EmptyState text="No tienes tareas pendientes" />

  const { vencidas, hoy, proximas, sinFecha } = groupMisTareas(tareas)

  return (
    <div className="space-y-1">
      {vencidas.length > 0 && (
        <div className="rounded-lg bg-red-50/50">
          <GroupHeader title="Vencidas" count={vencidas.length} className="text-red-600" />
          {vencidas.map((t) => (
            <TaskRow key={t.id} tarea={t} allTareas={tareas} {...handlers} />
          ))}
        </div>
      )}
      {hoy.length > 0 && (
        <div>
          <GroupHeader title="Hoy" count={hoy.length} className="text-amber-600" />
          {hoy.map((t) => (
            <TaskRow key={t.id} tarea={t} allTareas={tareas} {...handlers} />
          ))}
        </div>
      )}
      {proximas.length > 0 && (
        <div>
          <GroupHeader title="Proximas" count={proximas.length} />
          {proximas.map((t) => (
            <TaskRow key={t.id} tarea={t} allTareas={tareas} {...handlers} />
          ))}
        </div>
      )}
      {sinFecha.length > 0 && (
        <div>
          <GroupHeader title="Sin fecha" count={sinFecha.length} />
          {sinFecha.map((t) => (
            <TaskRow key={t.id} tarea={t} allTareas={tareas} {...handlers} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Equipo ────────────────────────────────────────────────
function EquipoTab({
  tareas,
  loading,
  handlers,
}: {
  tareas: Tarea[]
  loading: boolean
  handlers: TaskHandlers
}) {
  if (loading) return <LoadingSkeleton />
  if (tareas.length === 0) return <EmptyState text="No hay tareas de equipo" />

  const groups = groupByResponsable(tareas)

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const overdue = group.tareas.filter(
          (t) =>
            t.fecha_limite &&
            isBefore(new Date(t.fecha_limite), startOfDay(new Date())) &&
            !isToday(new Date(t.fecha_limite))
        ).length
        const initial = group.nombre
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()

        return (
          <div key={group.nombre} className="rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-600">
                {initial}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-stone-900">
                  {group.nombre}
                </span>
                <span className="ml-2 text-xs text-stone-400">
                  {group.tareas.length} pendiente{group.tareas.length !== 1 && "s"}
                </span>
              </div>
              {overdue > 0 && (
                <Badge className="bg-red-50 text-red-700">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {overdue} vencida{overdue !== 1 && "s"}
                </Badge>
              )}
            </div>
            <div>
              {group.tareas.map((t) => (
                <TaskRow key={t.id} tarea={t} allTareas={tareas} {...handlers} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Vencidas ──────────────────────────────────────────────
function VencidasTab({
  tareas,
  loading,
  handlers,
}: {
  tareas: Tarea[]
  loading: boolean
  handlers: TaskHandlers
}) {
  if (loading) return <LoadingSkeleton />
  if (tareas.length === 0)
    return <EmptyState text="No hay tareas vencidas" />

  const groups = groupByOverdue(tareas)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "Hoy") return -1
    if (b === "Hoy") return 1
    if (a === "Sin fecha") return 1
    if (b === "Sin fecha") return -1
    const numA = parseInt(a.match(/\d+/)?.[0] || "0")
    const numB = parseInt(b.match(/\d+/)?.[0] || "0")
    return numA - numB
  })

  return (
    <div className="space-y-1 rounded-lg bg-red-50/30">
      {sortedKeys.map((key) => (
        <div key={key}>
          <GroupHeader title={key} count={groups[key].length} className="text-red-600" />
          {groups[key].map((t) => (
            <TaskRow
              key={t.id}
              tarea={t}
              showResponsable
              allTareas={tareas}
              {...handlers}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Todas (Table view) ────────────────────────────────────
function TodasTab({
  tareas,
  loading,
  handlers,
}: {
  tareas: Tarea[]
  loading: boolean
  handlers: TaskHandlers
}) {
  if (loading) return <LoadingSkeleton rows={12} />
  if (tareas.length === 0) return <EmptyState text="No hay tareas" />

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/50">
            <th className="w-10 px-3 py-2.5" />
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Tarea
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Pedido
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Fase
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Asignado
            </th>
            <th className="w-8 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Pri
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Estado
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Limite
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
              Creada
            </th>
          </tr>
        </thead>
        <tbody>
          {tareas.map((t, idx) => {
            const fecha = fechaLimiteDisplay(t.fecha_limite)
            const estadoCfg = ESTADO_CONFIG[t.estado]
            const priCfg = PRIORIDAD_CONFIG[t.prioridad]
            return (
              <tr
                key={t.id}
                className={`border-b border-stone-100 transition-colors hover:bg-stone-50 ${
                  idx % 2 !== 0 ? "bg-stone-50/30" : ""
                }`}
              >
                <td className="px-3 py-2.5">
                  <TaskCheckbox
                    estado={t.estado}
                    onComplete={() => handlers.onComplete(t.id)}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`text-sm ${
                      t.estado === "terminada"
                        ? "text-stone-400 line-through"
                        : "text-stone-900"
                    }`}
                  >
                    {t.titulo}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {t.pedido ? (
                    <Link
                      href={`/pedidos/${t.pedido.id}`}
                      className="font-mono text-xs text-stone-500 hover:text-stone-700 hover:underline"
                    >
                      #{t.pedido.numero_tn || t.pedido.id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-xs text-stone-300">--</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-stone-500">{t.fase || "--"}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-stone-500">
                    {t.responsable?.nombre || "--"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {priCfg && t.prioridad !== "normal" && t.prioridad !== "baja" ? (
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${priCfg.dot}`} />
                  ) : (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-stone-200" />
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="secondary" className={estadoCfg.bg}>
                    {estadoCfg.label}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  {fecha ? (
                    <span className={`text-xs ${fecha.color}`}>{fecha.text}</span>
                  ) : (
                    <span className="text-xs text-stone-300">--</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-stone-400">
                    {format(new Date(t.created_at), "d MMM", { locale: es })}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Shared components ──────────────────────────────────────────
function LoadingSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-white py-16">
      <p className="text-sm text-stone-400">{text}</p>
    </div>
  )
}

// ─── Handler types ──────────────────────────────────────────────
interface TaskHandlers {
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onToggleSub: (id: string) => void
  onDelete: (id: string) => void
}

// ─── Main page ──────────────────────────────────────────────────
export default function TareasPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mis_tareas")
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filters
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroArea, setFiltroArea] = useState("todos")
  const [filtroPrioridad, setFiltroPrioridad] = useState("todos")

  // Data for modal
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [pedidosOptions, setPedidosOptions] = useState<PedidoOption[]>([])

  const router = useRouter()
  const supabase = createClient()

  // ─── Fetch reference data ─────────────────────────────────────
  useEffect(() => {
    async function fetchRefs() {
      const [{ data: usrs }, { data: peds }] = await Promise.all([
        supabase
          .from("usuarios")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("pedidos")
          .select("id, numero_tn, cliente:clientes(nombre)")
          .not("estado_interno", "in", '("cerrado","cancelado")')
          .order("created_at", { ascending: false })
          .limit(50),
      ])
      setUsuarios((usrs as Usuario[]) || [])
      // Supabase may return cliente as array or object depending on FK shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedPeds = (peds || []).map((p: any) => ({
        id: p.id,
        numero_tn: p.numero_tn,
        cliente: Array.isArray(p.cliente) ? p.cliente[0] || null : p.cliente,
      }))
      setPedidosOptions(normalizedPeds as PedidoOption[])
    }
    fetchRefs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Fetch tareas based on active tab + filters ───────────────
  const fetchTareas = useCallback(async () => {
    setLoading(true)

    try {
      if (activeTab === "mis_tareas") {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setTareas([])
          setLoading(false)
          return
        }
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("id")
          .eq("auth_id", user.id)
          .single()

        if (!usuario) {
          setTareas([])
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from("tareas")
          .select(TAREA_SELECT)
          .eq("responsable_id", usuario.id)
          .in("estado", ["pendiente", "en_proceso", "bloqueada"])
          .order("orden", { ascending: true })

        setTareas((data as Tarea[]) || [])
      } else if (activeTab === "equipo") {
        const { data } = await supabase
          .from("tareas")
          .select(TAREA_SELECT)
          .in("estado", ["pendiente", "en_proceso", "bloqueada"])
          .order("orden", { ascending: true })

        setTareas((data as Tarea[]) || [])
      } else if (activeTab === "vencidas") {
        const hoy = new Date().toISOString()
        const { data } = await supabase
          .from("tareas")
          .select(TAREA_SELECT)
          .lt("fecha_limite", hoy)
          .neq("estado", "terminada")
          .order("fecha_limite", { ascending: true })

        setTareas((data as Tarea[]) || [])
      } else {
        // todas
        let query = supabase
          .from("tareas")
          .select(TAREA_SELECT)
          .order("created_at", { ascending: false })

        if (filtroEstado !== "todos") {
          query = query.eq("estado", filtroEstado)
        }
        if (filtroArea !== "todos") {
          query = query.eq("area", filtroArea)
        }
        if (filtroPrioridad !== "todos") {
          query = query.eq("prioridad", filtroPrioridad)
        }
        if (busqueda) {
          query = query.ilike("titulo", `%${busqueda}%`)
        }

        const { data } = await query
        setTareas((data as Tarea[]) || [])
      }
    } catch {
      toast.error("Error al cargar tareas")
      setTareas([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filtroEstado, filtroArea, filtroPrioridad, busqueda])

  useEffect(() => {
    fetchTareas()
  }, [fetchTareas])

  // ─── Handlers ─────────────────────────────────────────────────
  async function handleComplete(tareaId: string) {
    try {
      await completarTarea(tareaId)
      toast.success("Tarea completada")
      router.refresh()
      fetchTareas()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
    }
  }

  async function handleStart(tareaId: string) {
    try {
      await iniciarTarea(tareaId)
      toast.success("Tarea iniciada")
      router.refresh()
      fetchTareas()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
    }
  }

  async function handleToggleSub(subtareaId: string) {
    try {
      await toggleSubtarea(subtareaId)
      fetchTareas()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
    }
  }

  async function handleDelete(tareaId: string) {
    try {
      await eliminarTarea(tareaId)
      toast.success("Tarea eliminada")
      router.refresh()
      fetchTareas()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
    }
  }

  const taskHandlers: TaskHandlers = {
    onComplete: handleComplete,
    onStart: handleStart,
    onToggleSub: handleToggleSub,
    onDelete: handleDelete,
  }

  // ─── Count badges ─────────────────────────────────────────────
  const vencidasCount = tareas.filter(
    (t) =>
      activeTab !== "vencidas" &&
      t.fecha_limite &&
      isBefore(new Date(t.fecha_limite), startOfDay(new Date())) &&
      !isToday(new Date(t.fecha_limite)) &&
      t.estado !== "terminada"
  ).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-stone-900">Tareas</h1>
          <p className="text-sm text-stone-500">
            Gestiona las tareas operativas del equipo
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva tarea
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeTab === tab.key
                ? "bg-white font-medium text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
            {tab.key === "vencidas" && vencidasCount > 0 && activeTab !== "vencidas" && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {vencidasCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters bar (only for "todas" tab) */}
      {activeTab === "todas" && (
        <div className="flex flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Buscar tarea..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={filtroEstado}
            onValueChange={(v: string | null) => v && setFiltroEstado(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="terminada">Terminada</SelectItem>
              <SelectItem value="bloqueada">Bloqueada</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filtroArea}
            onValueChange={(v: string | null) => v && setFiltroArea(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {AREA_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filtroPrioridad}
            onValueChange={(v: string | null) => v && setFiltroPrioridad(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "mis_tareas" && (
        <MisTareasTab tareas={tareas} loading={loading} handlers={taskHandlers} />
      )}
      {activeTab === "equipo" && (
        <EquipoTab tareas={tareas} loading={loading} handlers={taskHandlers} />
      )}
      {activeTab === "vencidas" && (
        <VencidasTab tareas={tareas} loading={loading} handlers={taskHandlers} />
      )}
      {activeTab === "todas" && (
        <TodasTab tareas={tareas} loading={loading} handlers={taskHandlers} />
      )}

      {/* Modal */}
      <NuevaTareaModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usuarios={usuarios}
        pedidos={pedidosOptions}
        onCreated={fetchTareas}
      />
    </div>
  )
}
