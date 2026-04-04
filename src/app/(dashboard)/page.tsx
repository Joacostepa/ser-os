"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PeriodSelector, type Period } from "@/components/reportes/period-selector"
import { GeneralTab } from "./tabs/general-tab"
import { ComercialTab } from "./tabs/comercial-tab"
import { OperativoTab } from "./tabs/operativo-tab"
import { RentabilidadTab } from "./tabs/rentabilidad-tab"
import { StockTab } from "./tabs/stock-tab"
import { FinancieroTab } from "./tabs/financiero-tab"

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("last_30_days")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vista general del negocio</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
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
          <GeneralTab period={period} />
        </TabsContent>
        <TabsContent value="comercial" className="mt-4">
          <ComercialTab period={period} />
        </TabsContent>
        <TabsContent value="operativo" className="mt-4">
          <OperativoTab period={period} />
        </TabsContent>
        <TabsContent value="rentabilidad" className="mt-4">
          <RentabilidadTab period={period} />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <StockTab />
        </TabsContent>
        <TabsContent value="financiero" className="mt-4">
          <FinancieroTab period={period} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
