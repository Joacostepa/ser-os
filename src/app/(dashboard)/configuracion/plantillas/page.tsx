"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { guardarPlantilla } from "@/lib/actions/checklist-templates"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2, GripVertical, Save } from "lucide-react"
import { toast } from "sonner"

interface PasoTemplate {
  titulo: string
  seccion: string
  asignado_default: string | null
}

const TIPOS = [
  { value: "logo_ser", label: "Logo SER" },
  { value: "marca_blanca", label: "Marca blanca" },
  { value: "personalizado", label: "Personalizado" },
]

const SECCIONES: Record<string, string[]> = {
  logo_ser: ["prearmado", "armado"],
  marca_blanca: ["prearmado", "armado"],
  personalizado: ["diseno", "prearmado", "armado"],
}

const SECCION_LABELS: Record<string, string> = {
  diseno: "DISEÑO GRÁFICO",
  prearmado: "PRE-ARMADO",
  armado: "ARMADO",
  despacho: "DESPACHO",
}

export default function PlantillasChecklistPage() {
  const [tipoActivo, setTipoActivo] = useState("logo_ser")
  const [pasos, setPasos] = useState<PasoTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const supabase = createClient()

  const loadTemplate = useCallback(async (tipo: string) => {
    setLoading(true)
    const { data } = await supabase
      .from("checklist_templates")
      .select("pasos")
      .eq("tipo_pedido", tipo)
      .eq("activo", true)
      .single()

    if (data?.pasos) {
      const parsed = typeof data.pasos === "string" ? JSON.parse(data.pasos) : data.pasos
      setPasos(parsed as PasoTemplate[])
    } else {
      setPasos([])
    }
    setDirty(false)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadTemplate(tipoActivo)
    supabase.from("usuarios").select("id, nombre, area").eq("activo", true).order("nombre")
      .then(({ data }) => setUsuarios(data || []))
  }, [tipoActivo, loadTemplate, supabase])

  function updatePaso(index: number, field: keyof PasoTemplate, value: string | null) {
    setPasos(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
    setDirty(true)
  }

  function removePaso(index: number) {
    setPasos(prev => prev.filter((_, i) => i !== index))
    setConfirmDelete(null)
    setDirty(true)
  }

  function addPaso(seccion: string) {
    setPasos(prev => {
      // Find last index of this section
      let lastIdx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].seccion === seccion) { lastIdx = i; break }
      }
      const newPaso: PasoTemplate = { titulo: "", seccion, asignado_default: null }
      if (lastIdx === -1) {
        return [...prev, newPaso]
      }
      const result = [...prev]
      result.splice(lastIdx + 1, 0, newPaso)
      return result
    })
    setDirty(true)
  }

  async function handleSave() {
    // Validate
    if (pasos.some(p => !p.titulo.trim())) {
      toast.error("Todos los pasos deben tener título")
      return
    }

    setSaving(true)
    try {
      await guardarPlantilla(tipoActivo, pasos)
      toast.success(`Plantilla de ${TIPOS.find(t => t.value === tipoActivo)?.label} guardada`)
      setDirty(false)
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  // Group pasos by seccion
  const secciones = SECCIONES[tipoActivo] || ["prearmado", "armado"]
  let globalIndex = 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Plantillas de checklist</h1>
        <p className="text-sm text-stone-400">Se copian automáticamente al habilitar un pedido</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {TIPOS.map(tipo => {
          const count = tipo.value === tipoActivo ? pasos.length : "..."
          const active = tipoActivo === tipo.value
          return (
            <button
              key={tipo.value}
              onClick={() => { if (dirty && !confirm("Tenés cambios sin guardar. ¿Cambiar de tab?")) return; setTipoActivo(tipo.value) }}
              className={`px-4 py-2 text-sm transition-colors ${
                active ? "text-stone-900 font-medium border-b-2 border-stone-800 -mb-px" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tipo.label} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white">
          {secciones.map(seccion => {
            const seccionPasos = pasos
              .map((p, originalIdx) => ({ ...p, originalIdx }))
              .filter(p => p.seccion === seccion)

            return (
              <div key={seccion}>
                {/* Section header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
                    {SECCION_LABELS[seccion] || seccion}
                  </span>
                </div>

                {/* Pasos */}
                <div className="px-2">
                  {seccionPasos.map(paso => {
                    globalIndex++
                    const idx = paso.originalIdx
                    const isDeleting = confirmDelete === idx

                    if (isDeleting) {
                      return (
                        <div key={idx} className="flex items-center gap-2 px-2 py-2 bg-red-50 rounded-lg mx-2 mb-1">
                          <span className="text-sm text-red-700 flex-1">¿Eliminar este paso?</span>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} className="text-stone-500">Cancelar</Button>
                          <Button size="sm" variant="ghost" onClick={() => removePaso(idx)} className="text-red-600">Eliminar</Button>
                        </div>
                      )
                    }

                    return (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1.5 group">
                        <GripVertical className="h-4 w-4 text-stone-300 cursor-grab shrink-0" />
                        <span className="font-mono text-xs text-stone-400 w-6 text-right shrink-0">{globalIndex}</span>
                        <Input
                          value={paso.titulo}
                          onChange={e => updatePaso(idx, "titulo", e.target.value)}
                          className="h-8 text-sm border-none bg-transparent hover:bg-stone-50 focus:bg-white focus:ring-1 focus:ring-stone-200 rounded px-2"
                          placeholder="Título del paso"
                        />
                        <select
                          value={paso.asignado_default || ""}
                          onChange={e => updatePaso(idx, "asignado_default", e.target.value || null)}
                          className="text-xs text-stone-500 border border-stone-200 rounded-md px-2 py-1.5 w-[140px] shrink-0 bg-white"
                        >
                          <option value="">Sin asignar</option>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {usuarios.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setConfirmDelete(idx)}
                          className="text-stone-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Add paso */}
                <div className="px-4 pb-3 pt-1">
                  <button
                    onClick={() => addPaso(seccion)}
                    className="text-xs text-stone-400 hover:text-stone-600 border border-dashed border-stone-200 rounded-lg px-3 py-2 w-full text-left hover:border-stone-300 hover:bg-stone-50 transition-colors"
                  >
                    <Plus className="h-3 w-3 inline mr-1.5" />
                    Agregar paso a {SECCION_LABELS[seccion]?.toLowerCase() || seccion}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Save button */}
          <div className="px-4 py-3 border-t border-stone-100 flex justify-end">
            <Button onClick={handleSave} disabled={saving || !dirty} className="relative">
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Guardando..." : "Guardar cambios"}
              {dirty && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
