"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { togglePaso, agregarPaso } from "@/lib/checklist/toggle-paso"
import { Check, Plus, User } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Paso {
  id: string
  pedido_id: string
  titulo: string
  completado: boolean
  completado_por: string | null
  completado_at: string | null
  asignado_a: string | null
  seccion: string | null
  orden: number
  notas: string | null
  // Joined fields (may not exist)
  asignado?: { id: string; nombre: string } | null
  completador?: { id: string; nombre: string } | null
}

export function PedidoChecklist({ pedidoId }: { pedidoId: string }) {
  const [pasos, setPasos] = useState<Paso[]>([])
  const [loading, setLoading] = useState(true)
  const [addingPaso, setAddingPaso] = useState(false)
  const [newPasoTitulo, setNewPasoTitulo] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const fetchPasos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedido_pasos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("orden", { ascending: true })

    if (error) {
      console.error("Error loading pasos:", error.message)
      setPasos([])
    } else {
      setPasos((data as Paso[]) ?? [])
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId])

  useEffect(() => {
    fetchPasos()
  }, [fetchPasos])

  // Also try to load user names for assigned/completed
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  useEffect(() => {
    const userIds = new Set<string>()
    for (const p of pasos) {
      if (p.asignado_a) userIds.add(p.asignado_a)
      if (p.completado_por) userIds.add(p.completado_por)
    }
    if (userIds.size === 0) return

    supabase
      .from("usuarios")
      .select("id, nombre")
      .in("id", Array.from(userIds))
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          for (const u of data) map[u.id] = u.nombre
          setUserMap(map)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasos])

  async function handleToggle(paso: Paso) {
    const newState = !paso.completado

    // Optimistic update
    setPasos((prev) =>
      prev.map((p) =>
        p.id === paso.id
          ? {
              ...p,
              completado: newState,
              completado_at: newState ? new Date().toISOString() : null,
            }
          : p,
      ),
    )

    try {
      await togglePaso(paso.id, newState)
    } catch (e) {
      // Revert on error
      setPasos((prev) =>
        prev.map((p) =>
          p.id === paso.id
            ? { ...p, completado: paso.completado, completado_at: paso.completado_at }
            : p,
        ),
      )
      const msg = e instanceof Error ? e.message : "Error"
      toast.error(msg)
    }
  }

  async function handleAddPaso() {
    if (!newPasoTitulo.trim()) return

    setSubmitting(true)
    try {
      await agregarPaso(pedidoId, newPasoTitulo.trim())
      setNewPasoTitulo("")
      setAddingPaso(false)
      await fetchPasos()
      toast.success("Paso agregado")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al agregar paso"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Group pasos by seccion
  const sections: { seccion: string | null; pasos: Paso[] }[] = []
  const sectionMap = new Map<string | null, Paso[]>()

  for (const paso of pasos) {
    const key = paso.seccion
    if (!sectionMap.has(key)) {
      sectionMap.set(key, [])
    }
    sectionMap.get(key)!.push(paso)
  }

  for (const [seccion, items] of sectionMap) {
    sections.push({ seccion, pasos: items })
  }

  const completados = pasos.filter((p) => p.completado).length
  const total = pasos.length
  const progressPct = total > 0 ? (completados / total) * 100 : 0

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="mb-4">
          <div className="h-4 w-32 animate-pulse rounded bg-stone-100" />
          <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-stone-100" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-stone-50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      {/* Header with progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-800">
            Checklist del pedido
          </h3>
          <span className="text-xs text-stone-400 font-mono">
            {completados}/{total}
          </span>
        </div>
        {total > 0 && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-stone-800 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {total === 0 && !addingPaso && (
        <div className="py-6 text-center">
          <p className="text-sm text-stone-400">
            No hay pasos en el checklist.
          </p>
          <p className="mt-1 text-xs text-stone-300">
            Se generan al habilitar el pedido o puedes agregar manualmente.
          </p>
        </div>
      )}

      {/* Sections */}
      {sections.map(({ seccion, pasos: seccionPasos }) => (
        <div key={seccion ?? "__default"} className="mb-2">
          {seccion && (
            <div className="mb-1 mt-3 first:mt-0">
              <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                {seccion}
              </span>
            </div>
          )}
          <div className="space-y-0.5">
            {seccionPasos.map((paso) => (
              <div
                key={paso.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-stone-50"
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(paso)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    paso.completado
                      ? "border-stone-400 bg-stone-800"
                      : "border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50"
                  }`}
                >
                  {paso.completado && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>

                {/* Titulo */}
                <span
                  className={`flex-1 text-sm ${
                    paso.completado
                      ? "text-stone-400 line-through"
                      : "text-stone-800"
                  }`}
                >
                  {paso.titulo}
                </span>

                {/* Right side: assigned + completion time */}
                <div className="flex shrink-0 items-center gap-2">
                  {paso.asignado_a && userMap[paso.asignado_a] && (
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <User className="h-3 w-3" />
                      {userMap[paso.asignado_a].split(" ")[0]}
                    </span>
                  )}
                  {paso.completado && paso.completado_at && (
                    <span className="text-xs text-stone-300">
                      {formatDistanceToNow(new Date(paso.completado_at), {
                        locale: es,
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add paso */}
      {addingPaso ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newPasoTitulo}
            onChange={(e) => setNewPasoTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPaso()
              if (e.key === "Escape") {
                setAddingPaso(false)
                setNewPasoTitulo("")
              }
            }}
            placeholder="Nombre del paso..."
            className="flex-1 rounded-md border border-stone-200 px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-400"
            disabled={submitting}
            autoFocus
          />
          <button
            onClick={handleAddPaso}
            disabled={submitting || !newPasoTitulo.trim()}
            className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
          >
            {submitting ? "..." : "Agregar"}
          </button>
          <button
            onClick={() => {
              setAddingPaso(false)
              setNewPasoTitulo("")
            }}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setAddingPaso(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar paso
        </button>
      )}
    </div>
  )
}
