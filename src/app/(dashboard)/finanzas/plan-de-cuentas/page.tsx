"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getPlanCuentas, toggleCuentaActiva } from "@/lib/actions/finanzas"
import { toast } from "sonner"

const TIPO_COLOR: Record<string, string> = {
  activo: "bg-blue-50 text-blue-700",
  pasivo: "bg-violet-50 text-violet-700",
  patrimonio: "bg-indigo-50 text-indigo-700",
  ingreso: "bg-green-50 text-green-700",
  costo: "bg-orange-50 text-orange-700",
  gasto: "bg-red-50 text-red-700",
}

interface Cuenta {
  id: number
  codigo: string
  nombre: string
  tipo: string
  nivel: number
  activa: boolean
  cuenta_padre_id: number | null
}

interface TreeNode extends Cuenta {
  children: TreeNode[]
}

function buildTree(cuentas: Cuenta[]): TreeNode[] {
  const map = new Map<number, TreeNode>()
  const roots: TreeNode[] = []

  cuentas.forEach((c) => {
    map.set(c.id, { ...c, children: [] })
  })

  cuentas.forEach((c) => {
    const node = map.get(c.id)!
    if (c.cuenta_padre_id && map.has(c.cuenta_padre_id)) {
      map.get(c.cuenta_padre_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function CuentaNode({
  cuenta,
  expandedIds,
  onToggleExpand,
  onToggleActiva,
}: {
  cuenta: TreeNode
  expandedIds: Set<number>
  onToggleExpand: (id: number) => void
  onToggleActiva: (id: number, activa: boolean) => void
}) {
  const isExpanded = expandedIds.has(cuenta.id)
  const hasChildren = cuenta.children.length > 0
  const indent = (cuenta.nivel - 1) * 24

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 border-b border-stone-100 hover:bg-stone-50 transition-colors ${
          cuenta.nivel === 1 ? "bg-stone-50" : ""
        }`}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onToggleExpand(cuenta.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        <span className="font-mono text-xs text-stone-400 w-16">{cuenta.codigo}</span>
        <span className={`text-sm flex-1 ${cuenta.nivel === 1 ? "font-medium text-stone-900" : cuenta.nivel === 2 ? "font-medium text-stone-700" : "text-stone-600"}`}>
          {cuenta.nombre}
        </span>

        <Badge className={`${TIPO_COLOR[cuenta.tipo] || "bg-stone-100 text-stone-600"} text-xs`}>
          {cuenta.tipo}
        </Badge>

        {cuenta.nivel === 3 && (
          <Button
            variant="ghost"
            size="xs"
            className={cuenta.activa ? "text-green-700" : "text-stone-400"}
            onClick={() => onToggleActiva(cuenta.id, !cuenta.activa)}
          >
            {cuenta.activa ? "Activa" : "Inactiva"}
          </Button>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {cuenta.children.map((child) => (
            <CuentaNode
              key={child.id}
              cuenta={child}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onToggleActiva={onToggleActiva}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlanDeCuentasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const data = await getPlanCuentas()
        setCuentas(data as Cuenta[])
        // Auto-expand nivel 1
        const nivel1Ids = (data as Cuenta[]).filter((c) => c.nivel === 1).map((c) => c.id)
        setExpandedIds(new Set(nivel1Ids))
      } catch {
        setCuentas([])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  function handleToggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleToggleActiva(id: number, activa: boolean) {
    try {
      await toggleCuentaActiva(id, activa)
      setCuentas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, activa } : c))
      )
      toast.success(activa ? "Cuenta activada" : "Cuenta desactivada")
    } catch {
      toast.error("Error al actualizar la cuenta")
    }
  }

  function handleExpandAll() {
    setExpandedIds(new Set(cuentas.map((c) => c.id)))
  }

  function handleCollapseAll() {
    setExpandedIds(new Set())
  }

  const tree = buildTree(cuentas)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Plan de cuentas</h1>
          <p className="text-sm text-stone-400">Estructura contable del negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExpandAll}>
            Expandir todo
          </Button>
          <Button variant="outline" size="sm" onClick={handleCollapseAll}>
            Colapsar todo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : tree.length > 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {tree.map((cuenta) => (
            <CuentaNode
              key={cuenta.id}
              cuenta={cuenta}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onToggleActiva={handleToggleActiva}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">No hay cuentas definidas</p>
      )}
    </div>
  )
}
