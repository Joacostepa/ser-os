"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Check, CheckCircle, User } from "lucide-react"
import { togglePaso } from "@/lib/checklist/toggle-paso"
import { crearTareaLibre, completarTarea } from "@/lib/actions/tareas"
import { toast } from "sonner"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ──────────────────────────────────────────────────────
type Tab = "mi_dia" | "equipo"

interface Paso {
  id: string
  pedido_id: string
  titulo: string
  completado: boolean
  completado_at: string | null
  asignado_a: string | null
  seccion: string | null
  orden: number
}

interface PedidoRef {
  id: string
  numero_tn: string | null
  tipo: string | null
  cliente: { nombre: string } | null
}

interface PasoConPedido extends Paso {
  pedido: PedidoRef | null
}

interface TareaLibre {
  id: string
  titulo: string
  prioridad: string
  fecha_limite: string | null
  estado: string
  pedido_id: string | null
}

interface EquipoGroup {
  personId: string
  nombre: string
  items: EquipoItem[]
  count: number
}

interface EquipoItem {
  tipo: "paso" | "tarea"
  id: string
  titulo: string
  pedido?: { id: string; numero_tn: string | null } | null
  prioridad?: string
}

interface Usuario {
  id: string
  nombre: string
}

// ── Constants ──────────────────────────────────────────────────
const PRIORIDAD_DOT: Record<string, string> = {
  urgente: "bg-red-500",
  alta: "bg-amber-500",
  normal: "bg-stone-300",
  baja: "bg-stone-200",
}

const TIPO_BADGE: Record<string, string> = {
  logo_ser: "bg-blue-50 text-blue-700",
  marca_blanca: "bg-purple-50 text-purple-700",
  personalizado: "bg-amber-50 text-amber-700",
  estandar: "bg-stone-100 text-stone-600",
  sin_clasificar: "bg-stone-100 text-stone-500",
}

// ── Main Page ──────────────────────────────────────────────────
export default function TareasPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mi_dia")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Mi dia data
  const [pasosByPedido, setPasosByPedido] = useState<
    { pedido: PedidoRef; pasos: PasoConPedido[]; totalPasos: number; completados: number }[]
  >([])
  const [tareasLibres, setTareasLibres] = useState<TareaLibre[]>([])

  // Equipo data
  const [equipoGroups, setEquipoGroups] = useState<EquipoGroup[]>([])

  // Users list for modal
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  // Current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id, rol")
        .eq("auth_id", user.id)
        .single()

      if (usuario) {
        setCurrentUserId(usuario.id)
        setCurrentUserRol(usuario.rol)
      }
    }
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch usuarios for modal
  useEffect(() => {
    supabase
      .from("usuarios")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        setUsuarios((data as Usuario[]) ?? [])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch Mi Dia ─────────────────────────────────────────────
  const fetchMiDia = useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      // Get pasos assigned to current user, incomplete
      const { data: pasosData } = await supabase
        .from("pedido_pasos")
        .select(
          "*, pedido:pedidos(id, numero_tn, tipo, cliente:clientes(nombre))",
        )
        .eq("asignado_a", currentUserId)
        .eq("completado", false)
        .order("orden", { ascending: true })

      // Group by pedido
      const groupMap = new Map<
        string,
        { pedido: PedidoRef; pasos: PasoConPedido[] }
      >()

      for (const paso of (pasosData ?? []) as PasoConPedido[]) {
        const pid = paso.pedido_id
        if (!groupMap.has(pid)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pedidoRef = paso.pedido as any
          groupMap.set(pid, {
            pedido: {
              id: pid,
              numero_tn: pedidoRef?.numero_tn ?? null,
              tipo: pedidoRef?.tipo ?? null,
              cliente: Array.isArray(pedidoRef?.cliente)
                ? pedidoRef.cliente[0] || null
                : pedidoRef?.cliente ?? null,
            },
            pasos: [],
          })
        }
        groupMap.get(pid)!.pasos.push(paso)
      }

      // For each pedido, get total pasos count (all, not just user's)
      const pedidoIds = Array.from(groupMap.keys())
      const groupsWithProgress = await Promise.all(
        Array.from(groupMap.entries()).map(async ([pid, group]) => {
          const { count: totalPasos } = await supabase
            .from("pedido_pasos")
            .select("id", { count: "exact", head: true })
            .eq("pedido_id", pid)

          const { count: completados } = await supabase
            .from("pedido_pasos")
            .select("id", { count: "exact", head: true })
            .eq("pedido_id", pid)
            .eq("completado", true)

          return {
            pedido: group.pedido,
            pasos: group.pasos,
            totalPasos: totalPasos ?? 0,
            completados: completados ?? 0,
          }
        }),
      )

      setPasosByPedido(groupsWithProgress)

      // Free tareas
      const { data: tareasData } = await supabase
        .from("tareas")
        .select("id, titulo, prioridad, fecha_limite, estado, pedido_id")
        .eq("responsable_id", currentUserId)
        .is("pedido_id", null)
        .neq("estado", "terminada")
        .order("created_at", { ascending: true })

      setTareasLibres((tareasData as TareaLibre[]) ?? [])
    } catch {
      toast.error("Error al cargar tareas")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  // ── Fetch Equipo ─────────────────────────────────────────────
  const fetchEquipo = useCallback(async () => {
    setLoading(true)

    try {
      // All incomplete pasos
      const { data: pasosData } = await supabase
        .from("pedido_pasos")
        .select("*, pedido:pedidos(id, numero_tn)")
        .eq("completado", false)
        .order("orden", { ascending: true })

      // All free tareas (no pedido), pendientes
      const { data: tareasData } = await supabase
        .from("tareas")
        .select(
          "id, titulo, prioridad, fecha_limite, estado, pedido_id, responsable_id",
        )
        .is("pedido_id", null)
        .neq("estado", "terminada")
        .order("created_at", { ascending: true })

      // Get all user IDs we need
      const userIds = new Set<string>()
      for (const p of pasosData ?? []) {
        if (p.asignado_a) userIds.add(p.asignado_a)
      }
      for (const t of tareasData ?? []) {
        if (t.responsable_id) userIds.add(t.responsable_id)
      }

      let userMap: Record<string, string> = {}
      if (userIds.size > 0) {
        const { data: usersData } = await supabase
          .from("usuarios")
          .select("id, nombre")
          .in("id", Array.from(userIds))

        if (usersData) {
          for (const u of usersData) userMap[u.id] = u.nombre
        }
      }

      // Group everything by person
      const groups = new Map<
        string,
        { nombre: string; items: EquipoItem[] }
      >()

      const addToGroup = (
        personId: string | null,
        nombre: string,
        item: EquipoItem,
      ) => {
        const key = personId || "sin_asignar"
        if (!groups.has(key)) {
          groups.set(key, { nombre, items: [] })
        }
        groups.get(key)!.items.push(item)
      }

      for (const paso of pasosData ?? []) {
        const personId = paso.asignado_a
        const nombre = personId ? userMap[personId] ?? "Desconocido" : "Sin asignar"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pedido = paso.pedido as any
        addToGroup(personId, nombre, {
          tipo: "paso",
          id: paso.id,
          titulo: paso.titulo,
          pedido: pedido
            ? { id: pedido.id, numero_tn: pedido.numero_tn }
            : null,
        })
      }

      for (const tarea of tareasData ?? []) {
        const personId = tarea.responsable_id
        const nombre = personId ? userMap[personId] ?? "Desconocido" : "Sin asignar"
        addToGroup(personId, nombre, {
          tipo: "tarea",
          id: tarea.id,
          titulo: tarea.titulo,
          prioridad: tarea.prioridad,
        })
      }

      const result: EquipoGroup[] = Array.from(groups.entries()).map(
        ([id, g]) => ({
          personId: id,
          nombre: g.nombre,
          items: g.items,
          count: g.items.length,
        }),
      )

      // Sort: "Sin asignar" last, then by count desc
      result.sort((a, b) => {
        if (a.personId === "sin_asignar") return 1
        if (b.personId === "sin_asignar") return -1
        return b.count - a.count
      })

      setEquipoGroups(result)
    } catch {
      toast.error("Error al cargar equipo")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load data on tab change ──────────────────────────────────
  useEffect(() => {
    if (activeTab === "mi_dia") {
      fetchMiDia()
    } else {
      fetchEquipo()
    }
  }, [activeTab, fetchMiDia, fetchEquipo])

  // ── Handlers ─────────────────────────────────────────────────
  async function handleTogglePaso(paso: PasoConPedido | Paso) {
    // Optimistic: remove from list
    setPasosByPedido((prev) =>
      prev
        .map((group) => ({
          ...group,
          pasos: group.pasos.filter((p) => p.id !== paso.id),
          completados: group.completados + 1,
        }))
        .filter((group) => group.pasos.length > 0),
    )

    try {
      await togglePaso(paso.id, true)
    } catch (e) {
      // Revert by refetching
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
      if (activeTab === "mi_dia") fetchMiDia()
      else fetchEquipo()
    }
  }

  async function handleCompleteTarea(tareaId: string) {
    // Optimistic: remove from list
    setTareasLibres((prev) => prev.filter((t) => t.id !== tareaId))

    try {
      await completarTarea(tareaId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
      fetchMiDia()
    }
  }

  async function handleToggleEquipoItem(item: EquipoItem) {
    // Optimistic: remove from groups
    setEquipoGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => i.id !== item.id),
          count: g.count - 1,
        }))
        .filter((g) => g.items.length > 0),
    )

    try {
      if (item.tipo === "paso") {
        await togglePaso(item.id, true)
      } else {
        await completarTarea(item.id)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
      fetchEquipo()
    }
  }

  const totalPending =
    activeTab === "mi_dia"
      ? pasosByPedido.reduce((acc, g) => acc + g.pasos.length, 0) +
        tareasLibres.length
      : equipoGroups.reduce((acc, g) => acc + g.count, 0)

  const isAdmin = currentUserRol === "admin"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-stone-900">
            {activeTab === "mi_dia" ? "Mi dia" : "Equipo"}
          </h1>
          <p className="text-sm text-stone-500">
            {totalPending > 0 ? (
              <>
                <span className="font-mono">{totalPending}</span> pendiente
                {totalPending !== 1 && "s"}
              </>
            ) : (
              "Sin tareas pendientes"
            )}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva tarea
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
        <button
          onClick={() => setActiveTab("mi_dia")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            activeTab === "mi_dia"
              ? "bg-white font-medium text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Mi dia
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("equipo")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeTab === "equipo"
                ? "bg-white font-medium text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Equipo
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "mi_dia" ? (
        <MiDiaContent
          pasosByPedido={pasosByPedido}
          tareasLibres={tareasLibres}
          onTogglePaso={handleTogglePaso}
          onCompleteTarea={handleCompleteTarea}
        />
      ) : (
        <EquipoContent
          groups={equipoGroups}
          onToggleItem={handleToggleEquipoItem}
        />
      )}

      {/* Nueva tarea modal */}
      <NuevaTareaModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usuarios={usuarios}
        onCreated={() => {
          if (activeTab === "mi_dia") fetchMiDia()
          else fetchEquipo()
        }}
      />
    </div>
  )
}

// ── Mi Dia Content ─────────────────────────────────────────────
function MiDiaContent({
  pasosByPedido,
  tareasLibres,
  onTogglePaso,
  onCompleteTarea,
}: {
  pasosByPedido: {
    pedido: PedidoRef
    pasos: PasoConPedido[]
    totalPasos: number
    completados: number
  }[]
  tareasLibres: TareaLibre[]
  onTogglePaso: (paso: PasoConPedido) => void
  onCompleteTarea: (id: string) => void
}) {
  const isEmpty = pasosByPedido.length === 0 && tareasLibres.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-16">
        <CheckCircle className="h-10 w-10 text-stone-200" />
        <p className="mt-3 text-sm font-medium text-stone-400">Todo listo</p>
        <p className="mt-1 text-xs text-stone-300">
          No tienes tareas pendientes
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tareas libres */}
      {tareasLibres.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Tareas libres
            </span>
          </div>
          <div className="divide-y divide-stone-50">
            {tareasLibres.map((tarea) => (
              <div
                key={tarea.id}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50"
              >
                <CheckboxButton
                  checked={false}
                  onClick={() => onCompleteTarea(tarea.id)}
                />
                <span className="flex-1 text-sm text-stone-800">
                  {tarea.titulo}
                </span>
                {tarea.prioridad &&
                  tarea.prioridad !== "normal" &&
                  tarea.prioridad !== "baja" && (
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${PRIORIDAD_DOT[tarea.prioridad] ?? "bg-stone-200"}`}
                    />
                  )}
                {tarea.fecha_limite && (
                  <span className="text-xs text-stone-400">
                    {formatDistanceToNow(new Date(tarea.fecha_limite), {
                      locale: es,
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pedido groups */}
      {pasosByPedido.map(({ pedido, pasos, totalPasos, completados }) => {
        const progressPct =
          totalPasos > 0 ? (completados / totalPasos) * 100 : 0

        return (
          <div
            key={pedido.id}
            className="rounded-xl border border-stone-200 bg-white"
          >
            {/* Pedido header */}
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/pedidos/${pedido.id}`}
                    className="font-mono text-sm text-stone-600 hover:text-stone-800 hover:underline"
                  >
                    #{pedido.numero_tn || pedido.id.slice(0, 8)}
                  </Link>
                  {pedido.cliente && (
                    <span className="text-sm text-stone-400">
                      {pedido.cliente.nombre}
                    </span>
                  )}
                  {pedido.tipo && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${TIPO_BADGE[pedido.tipo] ?? "bg-stone-100 text-stone-500"}`}
                    >
                      {pedido.tipo.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-1.5 rounded-full bg-stone-600 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    {completados}/{totalPasos}
                  </span>
                </div>
              </div>
            </div>

            {/* Pasos */}
            <div className="divide-y divide-stone-50">
              {pasos.map((paso) => (
                <div
                  key={paso.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50"
                >
                  <CheckboxButton
                    checked={false}
                    onClick={() => onTogglePaso(paso)}
                  />
                  <span className="flex-1 text-sm text-stone-800">
                    {paso.titulo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Equipo Content ─────────────────────────────────────────────
function EquipoContent({
  groups,
  onToggleItem,
}: {
  groups: EquipoGroup[]
  onToggleItem: (item: EquipoItem) => void
}) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-16">
        <CheckCircle className="h-10 w-10 text-stone-200" />
        <p className="mt-3 text-sm font-medium text-stone-400">Todo listo</p>
        <p className="mt-1 text-xs text-stone-300">
          No hay tareas pendientes en el equipo
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const initials = group.nombre
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()

        return (
          <div
            key={group.personId}
            className="rounded-xl border border-stone-200 bg-white"
          >
            {/* Person header */}
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-600">
                {group.personId === "sin_asignar" ? (
                  <User className="h-3.5 w-3.5 text-stone-400" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-stone-900">
                  {group.nombre}
                </span>
                <span className="ml-2 text-xs text-stone-400">
                  <span className="font-mono">{group.count}</span> pendiente
                  {group.count !== 1 && "s"}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-stone-50">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50"
                >
                  <CheckboxButton
                    checked={false}
                    onClick={() => onToggleItem(item)}
                  />
                  <span className="flex-1 text-sm text-stone-800">
                    {item.titulo}
                  </span>
                  {item.tipo === "paso" && item.pedido && (
                    <Link
                      href={`/pedidos/${item.pedido.id}`}
                      className="font-mono text-xs text-stone-400 hover:text-stone-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{item.pedido.numero_tn || item.pedido.id.slice(0, 8)}
                    </Link>
                  )}
                  {item.tipo === "tarea" && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-stone-100 text-stone-500"
                    >
                      libre
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Checkbox Button ────────────────────────────────────────────
function CheckboxButton({
  checked,
  onClick,
}: {
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? "border-stone-400 bg-stone-800"
          : "border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50"
      }`}
    >
      {checked && <Check className="h-3 w-3 text-white" />}
    </button>
  )
}

// ── Nueva Tarea Modal ──────────────────────────────────────────
function NuevaTareaModal({
  open,
  onOpenChange,
  usuarios,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  usuarios: Usuario[]
  onCreated: () => void
}) {
  const [titulo, setTitulo] = useState("")
  const [responsableId, setResponsableId] = useState("")
  const [prioridad, setPrioridad] = useState("normal")
  const [fechaLimite, setFechaLimite] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setTitulo("")
    setResponsableId("")
    setPrioridad("normal")
    setFechaLimite("")
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
        responsable_id: responsableId || undefined,
        prioridad: prioridad || undefined,
        fecha_limite: fechaLimite || undefined,
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
      <DialogContent className="sm:max-w-sm">
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
          </div>
          <div className="space-y-1.5">
            <Label>Fecha limite</Label>
            <Input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />
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

// ── Loading Skeleton ───────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}
