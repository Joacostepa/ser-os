"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PeriodSelector, type Period } from "@/components/reportes/period-selector"
import { MonedaToggle, type Moneda } from "@/components/reportes/moneda-toggle"
import { GeneralTab } from "./tabs/general-tab"
import { ComercialTab } from "./tabs/comercial-tab"
import { OperativoTab } from "./tabs/operativo-tab"
import { RentabilidadTab } from "./tabs/rentabilidad-tab"
import { StockTab } from "./tabs/stock-tab"
import { FinancieroTab } from "./tabs/financiero-tab"

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("ultimos_30")
  const [moneda, setMoneda] = useState<Moneda>("ARS")
  const [customDesde, setCustomDesde] = useState("")
  const [customHasta, setCustomHasta] = useState("")

  // Restore moneda preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ser_moneda")
    if (saved === "USD" || saved === "ARS") setMoneda(saved)
  }, [])

  function handleMonedaChange(m: Moneda) {
    setMoneda(m)
    localStorage.setItem("ser_moneda", m)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vista general del negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            customDesde={customDesde}
            customHasta={customHasta}
            onCustomChange={(d, h) => { setCustomDesde(d); setCustomHasta(h) }}
          />
          <MonedaToggle value={moneda} onChange={handleMonedaChange} />
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="operativo">Operativo</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
          <TabsTrigger value="stock">Stock & Compras</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralTab period={period} moneda={moneda} customDesde={customDesde} customHasta={customHasta} />
        </TabsContent>
        <TabsContent value="comercial" className="mt-4">
          <ComercialTab period={period} moneda={moneda} customDesde={customDesde} customHasta={customHasta} />
        </TabsContent>
        <TabsContent value="operativo" className="mt-4">
          <OperativoTab period={period} customDesde={customDesde} customHasta={customHasta} />
        </TabsContent>
        <TabsContent value="rentabilidad" className="mt-4">
          <RentabilidadTab period={period} moneda={moneda} customDesde={customDesde} customHasta={customHasta} />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <StockTab />
        </TabsContent>
        <TabsContent value="financiero" className="mt-4">
          <FinancieroTab period={period} moneda={moneda} customDesde={customDesde} customHasta={customHasta} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
