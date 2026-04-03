"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

export default function PlantillasConfigPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlantillas() {
      const { data } = await supabase
        .from("plantillas_tarea")
        .select("*")
        .order("tipo_pedido")
        .order("orden")

      setPlantillas(data || [])
      setLoading(false)
    }

    fetchPlantillas()
  }, [])

  const estandar = plantillas.filter((p) => p.tipo_pedido === "estandar")
  const personalizado = plantillas.filter((p) => p.tipo_pedido === "personalizado")

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Plantillas de tareas</h1>
        <p className="text-sm text-muted-foreground">
          Tareas que se generan automáticamente al habilitar un pedido
        </p>
      </div>

      <Tabs defaultValue="estandar">
        <TabsList>
          <TabsTrigger value="estandar">
            Estándar ({estandar.length})
          </TabsTrigger>
          <TabsTrigger value="personalizado">
            Personalizado ({personalizado.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estandar" className="mt-4">
          <PlantillasList plantillas={estandar} />
        </TabsContent>

        <TabsContent value="personalizado" className="mt-4">
          <PlantillasList plantillas={personalizado} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlantillasList({ plantillas }: { plantillas: any[] }) {
  return (
    <Card>
      <CardContent className="pt-4 divide-y">
        {plantillas.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-3">
            <span className="text-sm font-mono text-muted-foreground w-6 text-right">
              {p.orden}
            </span>
            <span className="text-sm font-medium flex-1">{p.titulo}</span>
            <Badge variant="secondary" className="capitalize text-xs">
              {p.area}
            </Badge>
            <Badge variant="outline" className="capitalize text-xs">
              {p.responsable_rol}
            </Badge>
            {p.depende_de_orden?.length > 0 && (
              <span className="text-xs text-muted-foreground">
                depende de: {p.depende_de_orden.join(", ")}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
