"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

const ROL_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  operaciones: "bg-blue-100 text-blue-700",
  diseno: "bg-purple-100 text-purple-700",
  armado: "bg-amber-100 text-amber-700",
  logistica: "bg-teal-100 text-teal-700",
  contabilidad: "bg-green-100 text-green-700",
}

export default function UsuariosConfigPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUsuarios() {
      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .order("nombre")

      setUsuarios(data || [])
      setLoading(false)
    }

    fetchUsuarios()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Usuarios internos del sistema. Para agregar usuarios, crealos desde Supabase Auth y registralos en la tabla usuarios.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map((user) => {
            const initials = user.nombre
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            return (
              <Card key={user.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.nombre}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="secondary" className={`capitalize ${ROL_COLORS[user.rol] || ""}`}>
                    {user.rol}
                  </Badge>
                  <Badge variant={user.activo ? "default" : "secondary"}>
                    {user.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}

          {usuarios.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay usuarios registrados
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
