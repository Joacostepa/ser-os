"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { getClubConfigAction, updateClubConfig } from "@/lib/actions/marketing"
import { toast } from "sonner"
import { Save } from "lucide-react"

const CONFIG_KEYS = {
  umbral_vip: { label: "Umbral VIP ($)", type: "number", group: "umbrales" },
  descuento_activa_est: { label: "Activa Estandar (%)", type: "number", group: "descuentos" },
  descuento_activa_vip: { label: "Activa VIP (%)", type: "number", group: "descuentos" },
  descuento_inactiva_est: { label: "Inactiva Estandar (%)", type: "number", group: "descuentos" },
  descuento_inactiva_vip: { label: "Inactiva VIP (%)", type: "number", group: "descuentos" },
  descuento_reactivacion_est: { label: "Reactivacion Estandar (%)", type: "number", group: "descuentos" },
  descuento_reactivacion_vip: { label: "Reactivacion VIP (%)", type: "number", group: "descuentos" },
  descuento_nunca_compro: { label: "Nunca compro (%)", type: "number", group: "descuentos" },
  monto_minimo_compra: { label: "Monto minimo compra ($)", type: "number", group: "umbrales" },
  dias_inactiva: { label: "Dias para inactiva", type: "number", group: "umbrales" },
  dias_dormida: { label: "Dias para dormida", type: "number", group: "umbrales" },
  dias_reactivacion: { label: "Dias para reactivacion", type: "number", group: "umbrales" },
  racha_envio_gratis: { label: "Racha para envio gratis (meses)", type: "number", group: "umbrales" },
  racha_subir_nivel: { label: "Racha para subir nivel (meses)", type: "number", group: "umbrales" },
  sender_name: { label: "Nombre del remitente", type: "text", group: "email" },
  sender_email: { label: "Email del remitente", type: "email", group: "email" },
} as const

type ConfigKey = keyof typeof CONFIG_KEYS

export default function MarketingConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
        const result = await getClubConfigAction()
        const mapped: Record<string, string> = {}
        for (const key of Object.keys(CONFIG_KEYS)) {
          mapped[key] = result[key] ?? ""
        }
        setConfig(mapped)
        setOriginal(mapped)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  function handleChange(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const changed = Object.keys(config).filter((k) => config[k] !== original[k])
      if (changed.length === 0) {
        toast.info("No hay cambios para guardar")
        setSaving(false)
        return
      }

      for (const key of changed) {
        await updateClubConfig(key, config[key])
      }

      setOriginal({ ...config })
      toast.success(`${changed.length} configuracion${changed.length > 1 ? "es" : ""} actualizada${changed.length > 1 ? "s" : ""}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar configuracion")
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(config).some((k) => config[k] !== original[k])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  // Group config fields
  const umbralKeys = (Object.keys(CONFIG_KEYS) as ConfigKey[]).filter((k) => CONFIG_KEYS[k].group === "umbrales")
  const descuentoKeys = (Object.keys(CONFIG_KEYS) as ConfigKey[]).filter((k) => CONFIG_KEYS[k].group === "descuentos")
  const emailKeys = (Object.keys(CONFIG_KEYS) as ConfigKey[]).filter((k) => CONFIG_KEYS[k].group === "email")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Configuracion</h1>
          <p className="text-sm text-stone-400">Parametros del Club SER</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {/* Umbrales y descuentos */}
      <DashboardCard title="Umbrales y descuentos" description="Parametros para clasificacion y beneficios">
        <div className="space-y-6">
          {/* Umbral VIP y montos */}
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Umbrales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {umbralKeys.map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-stone-500">{CONFIG_KEYS[key].label}</Label>
                  <Input
                    type={CONFIG_KEYS[key].type}
                    value={config[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Descuentos */}
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Descuentos por estado y nivel</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {descuentoKeys.map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-stone-500">{CONFIG_KEYS[key].label}</Label>
                  <Input
                    type="number"
                    value={config[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="font-mono"
                    min={0}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Email */}
      <DashboardCard title="Email" description="Configuracion del remitente de campanas">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {emailKeys.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-stone-500">{CONFIG_KEYS[key].label}</Label>
              <Input
                type={CONFIG_KEYS[key].type}
                value={config[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  )
}
