"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RolBadge } from "@/components/shared/rol-badge"
import {
  ROL_CONFIG,
  ROL_DESCRIPCIONES,
  MENU_POR_ROL,
  puedeVerCostos,
  puedeVerFinanzas,
  puedeVerMontos,
  puedeEditarPedidos,
} from "@/lib/auth/permisos"
import {
  actualizarUsuario,
  desactivarUsuario,
  reactivarUsuario,
} from "@/lib/actions/usuarios"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Check, X, AlertTriangle, Save } from "lucide-react"

const AREAS = [
  "Operaciones",
  "Diseno",
  "Armado",
  "Logistica",
  "Contabilidad",
  "Administracion",
]

interface Usuario {
  id: string
  nombre: string
  apellido: string | null
  email: string
  rol: string
  activo: boolean
  area: string | null
  telefono: string | null
  avatar_url: string | null
  ultimo_acceso: string | null
  created_at: string
  updated_at: string | null
}

// Permission check items for display
const PERMISOS_CHECK = [
  { key: "costos", label: "Ver costos", fn: puedeVerCostos },
  { key: "finanzas", label: "Ver finanzas", fn: puedeVerFinanzas },
  { key: "montos", label: "Ver montos", fn: puedeVerMontos },
  { key: "editar_pedidos", label: "Editar pedidos", fn: puedeEditarPedidos },
]

export default function UsuarioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Editable fields
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [telefono, setTelefono] = useState("")
  const [rol, setRol] = useState("")
  const [area, setArea] = useState("")

  useEffect(() => {
    async function fetchUsuario() {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        toast.error("Usuario no encontrado")
        router.push("/configuracion/usuarios")
        return
      }

      const u = data as Usuario
      setUsuario(u)
      setNombre(u.nombre || "")
      setApellido(u.apellido || "")
      setTelefono(u.telefono || "")
      setRol(u.rol || "lectura")
      setArea(u.area || "")
      setLoading(false)
    }

    fetchUsuario()
  }, [id])

  async function handleSave() {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setSaving(true)
    try {
      await actualizarUsuario(id, {
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        telefono: telefono.trim() || undefined,
        rol,
        area: area || undefined,
      })
      toast.success("Usuario actualizado")
      // Refresh local state
      setUsuario((prev) =>
        prev
          ? { ...prev, nombre: nombre.trim(), apellido: apellido.trim() || null, telefono: telefono.trim() || null, rol, area: area || null }
          : null
      )
    } catch {
      toast.error("Error al actualizar el usuario")
    } finally {
      setSaving(false)
    }
  }

  async function handleDesactivar() {
    setActionLoading(true)
    try {
      await desactivarUsuario(id)
      setUsuario((prev) => (prev ? { ...prev, activo: false } : null))
      toast.success("Usuario desactivado. Sus tareas pendientes fueron desasignadas.")
    } catch {
      toast.error("Error al desactivar el usuario")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReactivar() {
    setActionLoading(true)
    try {
      await reactivarUsuario(id)
      setUsuario((prev) => (prev ? { ...prev, activo: true } : null))
      toast.success("Usuario reactivado")
    } catch {
      toast.error("Error al reactivar el usuario")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!usuario) return null

  const displayName = usuario.apellido
    ? `${usuario.nombre} ${usuario.apellido}`
    : usuario.nombre
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const modulosPermitidos = MENU_POR_ROL[rol] || []

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/configuracion/usuarios")}
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Usuarios
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-full text-lg font-medium flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#3d4a3e", color: "#e8e6df" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">{displayName}</h1>
            {!usuario.activo && (
              <span className="text-[10px] font-medium text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                Inactivo
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{usuario.email}</p>
        </div>
        <RolBadge rol={usuario.rol} />
      </div>

      <Separator />

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={usuario.email} disabled className="bg-stone-50" />
          </div>
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 11 ..."
            />
          </div>
          <div className="space-y-2">
            <Label>Area</Label>
            <Select value={area} onValueChange={(v: string | null) => v && setArea(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar area" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {usuario.created_at && (
            <p className="text-xs text-muted-foreground">
              Creado el{" "}
              {format(new Date(usuario.created_at), "d 'de' MMMM yyyy", {
                locale: es,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rol y permisos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rol y permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={(v: string | null) => v && setRol(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROL_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rol && ROL_DESCRIPCIONES[rol] && (
              <p className="text-xs text-muted-foreground">
                {ROL_DESCRIPCIONES[rol]}
              </p>
            )}
          </div>

          <Separator />

          {/* Permissions summary */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Modulos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Dashboard",
                "Operaciones",
                "Pedidos",
                "Tareas",
                "Productos",
                "Clientes",
                "Pagos",
                "Proveedores",
                "Compras",
                "Insumos",
                "Finanzas",
                "Configuracion",
              ].map((modulo) => {
                const allowed =
                  rol === "admin" || modulosPermitidos.includes(modulo)
                return (
                  <span
                    key={modulo}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${
                      allowed
                        ? "bg-green-50 text-green-700"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {allowed ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {modulo}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Capacidades
            </p>
            <div className="space-y-1.5">
              {PERMISOS_CHECK.map(({ key, label, fn }) => {
                const allowed = fn(rol)
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-xs"
                  >
                    {allowed ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-stone-300" />
                    )}
                    <span
                      className={
                        allowed ? "text-stone-700" : "text-stone-400"
                      }
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-1.5" />
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>

      {/* Zona peligrosa */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Zona peligrosa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">
                {usuario.activo ? "Desactivar usuario" : "Reactivar usuario"}
              </p>
              <p className="text-xs text-muted-foreground">
                {usuario.activo
                  ? "El usuario no podra acceder al sistema. Sus tareas pendientes seran desasignadas."
                  : "El usuario podra volver a acceder al sistema."}
              </p>
            </div>
            {usuario.activo ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDesactivar}
                disabled={actionLoading}
              >
                {actionLoading ? "Procesando..." : "Desactivar"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivar}
                disabled={actionLoading}
              >
                {actionLoading ? "Procesando..." : "Reactivar"}
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">
                Resetear password
              </p>
              <p className="text-xs text-muted-foreground">
                Se enviara un email para restablecer la contrasena.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Reset de password no disponible aun. Usar Supabase Auth directamente.")}
            >
              Resetear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
