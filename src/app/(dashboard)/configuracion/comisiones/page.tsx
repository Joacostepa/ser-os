"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getComisionesConfig, actualizarComisionesConfig } from "@/lib/actions/comisiones"
import { Info, Check, Loader2 } from "lucide-react"

// Tasas de Pago Nube por plan y plazo
const tasasPagoNube: Record<string, Record<string, number>> = {
  inicial: { "1_dia": 7.69, "7_dias": 5.59, "14_dias": 4.69 },
  impulso: { "1_dia": 6.09, "7_dias": 4.39, "14_dias": 3.49 },
  escala: { "1_dia": 5.89, "7_dias": 4.19, "14_dias": 3.29 },
}

const comisionTnPorPlan: Record<string, number> = {
  inicial: 2.0,
  impulso: 1.0,
  escala: 0.7,
}

const planLabels: Record<string, string> = {
  inicial: "Inicial",
  impulso: "Impulso",
  escala: "Escala",
}

const plazoLabels: Record<string, string> = {
  "1_dia": "1 día",
  "7_dias": "7 días",
  "14_dias": "14 días",
}

interface ConfigRow {
  id: number
  metodo_pago: string
  nombre: string
  tipo: string
  tasa_porcentaje: number
  incluye_iva: boolean
  tasa_iva: number
  comision_fija: number
  comision_tn_adicional: boolean
  activo: boolean
  notas: string | null
}

export default function ComisionesConfigPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [plan, setPlan] = useState("impulso")
  const [plazo, setPlazo] = useState("7_dias")
  const [planBanner, setPlanBanner] = useState("")

  // Simulador
  const [simMonto, setSimMonto] = useState(200000)
  const [simMetodo, setSimMetodo] = useState("pago_nube_tarjeta")

  useEffect(() => {
    getComisionesConfig().then((data) => {
      setConfigs(data as ConfigRow[])
      setLoading(false)
    })
  }, [])

  function updateTasa(id: number, value: string) {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, tasa_porcentaje: num } : c)))
    setSaved(false)
  }

  function toggleActivo(id: number) {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, activo: !c.activo } : c)))
    setSaved(false)
  }

  function handlePlanChange(newPlan: string) {
    setPlan(newPlan)
    applyPlanRates(newPlan, plazo)
  }

  function handlePlazoChange(newPlazo: string) {
    setPlazo(newPlazo)
    applyPlanRates(plan, newPlazo)
  }

  function applyPlanRates(p: string, pl: string) {
    const tasaTarjeta = tasasPagoNube[p]?.[pl]
    const tasaTn = comisionTnPorPlan[p]
    if (!tasaTarjeta) return

    setConfigs((prev) =>
      prev.map((c) => {
        if (c.metodo_pago === "pago_nube_tarjeta") return { ...c, tasa_porcentaje: tasaTarjeta }
        if (c.metodo_pago === "tienda_nube_transaccion") return { ...c, tasa_porcentaje: tasaTn }
        return c
      })
    )
    setPlanBanner(`Tasas actualizadas según plan ${planLabels[p]} con retiro en ${plazoLabels[pl]}. Verificá y guardá.`)
    setSaved(false)
  }

  async function guardar() {
    setSaving(true)
    await actualizarComisionesConfig(
      configs.map((c) => ({ id: c.id, tasa_porcentaje: c.tasa_porcentaje, activo: c.activo }))
    )
    setSaving(false)
    setSaved(true)
    setPlanBanner("")
  }

  // Simulador
  const simConfig = configs.find((c) => c.metodo_pago === simMetodo)
  const simTasa = (simConfig?.tasa_porcentaje || 0) / 100
  const simComisionNeta = simMonto * simTasa
  const simIva = simConfig?.incluye_iva ? 0 : simComisionNeta * (simConfig?.tasa_iva || 0.21)
  const simComisionTotal = simComisionNeta + simIva

  // TN adicional
  const tnConfig = configs.find((c) => c.metodo_pago === "tienda_nube_transaccion")
  const simTnComision = simConfig?.comision_tn_adicional ? simMonto * ((tnConfig?.tasa_porcentaje || 0) / 100) : 0
  const simTotalComisiones = simComisionTotal + simTnComision
  const simNeto = simMonto - simTotalComisiones
  const simPctTotal = simMonto > 0 ? (simTotalComisiones / simMonto) * 100 : 0

  const pasarelas = configs.filter((c) => c.tipo === "pasarela")
  const plataforma = configs.filter((c) => c.tipo === "plataforma")
  const manuales = configs.filter((c) => c.tipo === "manual")

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Comisiones de medios de pago</h1></div>
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Comisiones de medios de pago</h1>
        <p className="text-sm text-muted-foreground">Configurá las tasas de comisión de cada método</p>
      </div>

      {/* Plan selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu plan de Tienda Nube</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Plan actual</label>
              <Select value={plan} onValueChange={(v: string | null) => v && handlePlanChange(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicial">Inicial</SelectItem>
                  <SelectItem value="impulso">Impulso</SelectItem>
                  <SelectItem value="escala">Escala</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Plazo de retiro</label>
              <Select value={plazo} onValueChange={(v: string | null) => v && handlePlazoChange(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_dia">1 día</SelectItem>
                  <SelectItem value="7_dias">7 días</SelectItem>
                  <SelectItem value="14_dias">14 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Las comisiones de Pago Nube dependen del plan y del plazo de retiro. Actualizá estos datos si cambiás de plan o de plazo.</span>
          </div>
          {planBanner && (
            <div className="bg-blue-50 text-blue-700 text-sm rounded-lg px-3 py-2">
              {planBanner}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pasarelas de pago */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pasarelas de pago</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-stone-100">
                <th className="text-left py-2 font-normal">Método</th>
                <th className="text-right py-2 font-normal">Tasa</th>
                <th className="text-center py-2 font-normal">IVA</th>
                <th className="text-center py-2 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pasarelas.map((c) => (
                <ConfigTableRow key={c.id} config={c} onTasaChange={updateTasa} onToggle={toggleActivo} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Comisión de TN */}
      <Card>
        <CardHeader><CardTitle className="text-base">Comisión de Tienda Nube</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              {plataforma.map((c) => (
                <ConfigTableRow key={c.id} config={c} onTasaChange={updateTasa} onToggle={toggleActivo} />
              ))}
            </tbody>
          </table>
          <div className="flex items-start gap-2 text-xs text-muted-foreground mt-3">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Se aplica en ventas con medios que no son Pago Nube. Con Pago Nube queda bonificado (0%).</span>
          </div>
        </CardContent>
      </Card>

      {/* Medios sin comisión */}
      <Card>
        <CardHeader><CardTitle className="text-base">Medios sin comisión de pasarela</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              {manuales.map((c) => (
                <ConfigTableRow key={c.id} config={c} onTasaChange={updateTasa} onToggle={toggleActivo} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Guardar */}
      <div className="flex items-center gap-3">
        <Button onClick={guardar} disabled={saving || saved}>
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
          ) : saved ? (
            <><Check className="h-4 w-4 mr-2" />Guardado</>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>

      {/* Simulador */}
      <Card>
        <CardHeader><CardTitle className="text-base">Simulador de comisiones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Monto de venta</label>
              <div className="flex items-center">
                <span className="text-sm text-stone-400 mr-1">$</span>
                <input
                  type="number"
                  value={simMonto}
                  onChange={(e) => setSimMonto(Number(e.target.value))}
                  className="font-[Geist_Mono] text-sm w-32 text-right border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Método</label>
              <Select value={simMetodo} onValueChange={(v: string | null) => v && setSimMetodo(v)}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {configs.filter((c) => c.activo).map((c) => (
                    <SelectItem key={c.metodo_pago} value={c.metodo_pago}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-1.5">
            {simConfig && simConfig.tasa_porcentaje > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Comisión pasarela ({simConfig.tasa_porcentaje.toFixed(2)}%)</span>
                <span className="font-[Geist_Mono] text-red-500">-${simComisionNeta.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {simIva > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">IVA comisión (21%)</span>
                <span className="font-[Geist_Mono] text-red-500">-${simIva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {simTnComision > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Comisión TN ({tnConfig?.tasa_porcentaje.toFixed(2)}%)</span>
                <span className="font-[Geist_Mono] text-red-500">-${simTnComision.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-medium">
              <span>Total comisiones</span>
              <span className="font-[Geist_Mono] text-red-600">-${simTotalComisiones.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Neto que recibís</span>
              <span className="font-[Geist_Mono] text-stone-800">${simNeto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {simTotalComisiones > 0 && (
            <p className="text-xs text-stone-400 italic">
              Por cada ${simMonto.toLocaleString("es-AR")} que cobrás con {simConfig?.nombre?.toLowerCase() || "este método"},
              recibís ${simNeto.toLocaleString("es-AR", { minimumFractionDigits: 0 })}. Perdés el {simPctTotal.toFixed(1)}% en comisiones.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ConfigTableRow({
  config,
  onTasaChange,
  onToggle,
}: {
  config: ConfigRow
  onTasaChange: (id: number, value: string) => void
  onToggle: (id: number) => void
}) {
  return (
    <tr className="border-b border-stone-50 last:border-0">
      <td className="py-2.5 text-sm text-stone-700">{config.nombre}</td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            value={config.tasa_porcentaje}
            onChange={(e) => onTasaChange(config.id, e.target.value)}
            className="font-[Geist_Mono] text-sm w-16 text-right border border-stone-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
            min="0"
            step="0.01"
          />
          <span className="text-sm text-stone-400">%</span>
        </div>
      </td>
      <td className="py-2.5 text-center">
        {!config.incluye_iva && config.tasa_porcentaje > 0 && (
          <Badge variant="secondary" className="text-[10px] text-stone-400 bg-stone-100">
            +IVA
          </Badge>
        )}
      </td>
      <td className="py-2.5 text-center">
        <button
          onClick={() => onToggle(config.id)}
          className={`text-lg cursor-pointer transition-opacity ${config.activo ? "opacity-100" : "opacity-30"}`}
          title={config.activo ? "Activo — click para desactivar" : "Inactivo — click para activar"}
        >
          {config.activo ? "✅" : "⬜"}
        </button>
      </td>
    </tr>
  )
}
