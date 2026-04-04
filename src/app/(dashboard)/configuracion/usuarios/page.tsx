"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RolBadge } from "@/components/shared/rol-badge"
import { ROL_CONFIG, ROL_DESCRIPCIONES } from "@/lib/auth/permisos"
import { invitarUsuario, cancelarInvitacion } from "@/lib/actions/usuarios"
import { getCurrentUser } from "@/lib/actions/auth"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Users, Mail, RotateCw, X } from "lucide-react"

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
  avatar_url: string | null
  ultimo_acceso: string | null
  created_at: string
}

interface Invitacion {
  id: string
  email: string
  nombre: string
  rol: string
  area: string | null
  estado: string
  invitado_por: string
  created_at: string
}

export default function UsuariosConfigPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [invNombre, setInvNombre] = useState("")
  const [invEmail, setInvEmail] = useState("")
  const [invRol, setInvRol] = useState("lectura")
  const [invArea, setInvArea] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const [usuariosRes, invitacionesRes] = await Promise.all([
        supabase
          .from("usuarios")
          .select("id, nombre, apellido, email, rol, activo, area, avatar_url, ultimo_acceso, created_at")
          .order("nombre", { ascending: true }),
        supabase
          .from("invitaciones")
          .select("*")
          .eq("estado", "pendiente")
          .order("created_at", { ascending: false }),
      ])

      setUsuarios((usuariosRes.data as Usuario[]) || [])
      setInvitaciones((invitacionesRes.data as Invitacion[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const activosCount = usuarios.filter((u) => u.activo).length
  const invitacionesPendientesCount = invitaciones.length

  function getInitials(nombre: string, apellido?: string | null) {
    const parts = apellido ? `${nombre} ${apellido}` : nombre
    return parts
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault()
    if (!invNombre.trim() || !invEmail.trim()) {
      toast.error("Nombre y email son requeridos")
      return
    }

    setSubmitting(true)
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        toast.error("No se pudo obtener el usuario actual")
        return
      }

      await invitarUsuario({
        nombre: invNombre.trim(),
        email: invEmail.trim(),
        rol: invRol,
        area: invArea || undefined,
        invitado_por: currentUser.id,
      })
      toast.success("Invitacion enviada")
      setDialogOpen(false)
      setInvNombre("")
      setInvEmail("")
      setInvRol("lectura")
      setInvArea("")
      // Refresh invitations
      const { data } = await supabase
        .from("invitaciones")
        .select("*")
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false })
      setInvitaciones((data as Invitacion[]) || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al invitar usuario")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelarInvitacion(id: string) {
    setCancellingId(id)
    try {
      await cancelarInvitacion(id)
      setInvitaciones((prev) => prev.filter((inv) => inv.id !== id))
      toast.success("Invitacion cancelada")
    } catch {
      toast.error("Error al cancelar invitacion")
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestion del equipo
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1.5" />
            Invitar usuario
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invitar usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvitar} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={invNombre}
                  onChange={(e) => setInvNombre(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={invRol} onValueChange={(v: string | null) => v && setInvRol(v)}>
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
                {invRol && ROL_DESCRIPCIONES[invRol] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {ROL_DESCRIPCIONES[invRol]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select value={invArea} onValueChange={(v: string | null) => v && setInvArea(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? "Enviando..." : "Enviar invitacion"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
                <Users className="h-4 w-4 text-stone-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{activosCount}</p>
                <p className="text-xs text-muted-foreground">Usuarios activos</p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
                <Mail className="h-4 w-4 text-stone-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{invitacionesPendientesCount}</p>
                <p className="text-xs text-muted-foreground">Invitaciones pendientes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {usuarios.map((user) => {
            const initials = getInitials(user.nombre, user.apellido)
            const displayName = user.apellido
              ? `${user.nombre} ${user.apellido}`
              : user.nombre

            return (
              <div
                key={user.id}
                onClick={() => router.push(`/configuracion/usuarios/${user.id}`)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors hover:bg-stone-50 border border-transparent hover:border-stone-200"
              >
                {/* Avatar */}
                <div
                  className="h-9 w-9 rounded-full text-xs font-medium flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#3d4a3e", color: "#e8e6df" }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {displayName}
                    </p>
                    {!user.activo && (
                      <span className="text-[10px] font-medium text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {/* Area */}
                {user.area && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {user.area}
                  </span>
                )}

                {/* Rol badge */}
                <RolBadge rol={user.rol} />

                {/* Last access */}
                <span className="text-[11px] text-muted-foreground hidden md:block min-w-[80px] text-right">
                  {user.ultimo_acceso
                    ? formatDistanceToNow(new Date(user.ultimo_acceso), {
                        locale: es,
                        addSuffix: true,
                      })
                    : "Sin acceso"}
                </span>
              </div>
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

      {/* Invitaciones pendientes */}
      {!loading && invitaciones.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-stone-700">
            Invitaciones pendientes
          </h2>
          <div className="space-y-1">
            {invitaciones.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-stone-200 bg-stone-50/50"
              >
                {/* Icon */}
                <div className="h-9 w-9 rounded-full text-xs font-medium flex items-center justify-center shrink-0 bg-stone-200 text-stone-500">
                  <Mail className="h-4 w-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">
                    {inv.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.email}
                  </p>
                </div>

                {/* Rol */}
                <RolBadge rol={inv.rol} />

                {/* Sent time */}
                <span className="text-[11px] text-muted-foreground hidden sm:block">
                  {formatDistanceToNow(new Date(inv.created_at), {
                    locale: es,
                    addSuffix: true,
                  })}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Reenviar"
                    onClick={() => toast.info("Reenvio no disponible aun")}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Cancelar invitacion"
                    disabled={cancellingId === inv.id}
                    onClick={() => handleCancelarInvitacion(inv.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
