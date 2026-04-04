"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search } from "lucide-react"
import { crearProveedor } from "@/lib/actions/proveedores"
import { CALIFICACION_PROVEEDOR_CONFIG, RUBRO_PROVEEDOR_CONFIG } from "@/lib/constants"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"
import type { RubroProveedor, CalificacionProveedor } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proveedoresColumns: ColumnDef<any>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.nombre}</span>
        {row.original.contacto_principal && row.original.contacto_principal !== row.original.nombre && (
          <p className="text-xs text-muted-foreground">{row.original.contacto_principal}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "rubro",
    header: "Rubro",
    cell: ({ row }) => {
      const config = RUBRO_PROVEEDOR_CONFIG[row.original.rubro as RubroProveedor]
      return <Badge variant="secondary" className={config?.color}>{config?.label}</Badge>
    },
  },
  {
    accessorKey: "calificacion",
    header: "Calificación",
    cell: ({ row }) => {
      const config = CALIFICACION_PROVEEDOR_CONFIG[row.original.calificacion as CalificacionProveedor]
      return <Badge variant="secondary" className={config?.color}>{config?.label}</Badge>
    },
  },
  { accessorKey: "telefono", header: "Teléfono" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "tiempo_entrega_dias",
    header: "Entrega",
    cell: ({ row }) => {
      const dias = row.original.tiempo_entrega_dias
      return dias ? `${dias} días` : "—"
    },
  },
  {
    accessorKey: "activo",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant="secondary" className={row.original.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
        {row.original.activo ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
]

export default function ProveedoresPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [nombre, setNombre] = useState("")
  const [contacto, setContacto] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [rubro, setRubro] = useState<RubroProveedor>("otro")
  const [calificacion, setCalificacion] = useState<CalificacionProveedor>("bueno")
  const [notas, setNotas] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchProveedores() {
      setLoading(true)
      let query = supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true })

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,contacto_principal.ilike.%${busqueda}%`)
      }

      const { data } = await query
      setProveedores(data || [])
      setLoading(false)
    }

    fetchProveedores()
  }, [busqueda])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setSubmitting(true)
    try {
      await crearProveedor({
        nombre: nombre.trim(),
        contacto_principal: contacto || undefined,
        email: email || undefined,
        telefono: telefono || undefined,
        rubro,
        calificacion,
        notas: notas || undefined,
      })
      toast.success("Proveedor creado")
      setDialogOpen(false)
      setNombre("")
      setContacto("")
      setEmail("")
      setTelefono("")
      setRubro("otro")
      setCalificacion("bueno")
      setNotas("")
      window.location.reload()
    } catch {
      toast.error("Error al crear el proveedor")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Gestión de proveedores e insumos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo proveedor
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrear} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre / Razón social *</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contacto principal</Label>
                  <Input value={contacto} onChange={(e) => setContacto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rubro</Label>
                  <Select value={rubro} onValueChange={(v) => setRubro(v as RubroProveedor)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RUBRO_PROVEEDOR_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Calificación</Label>
                  <Select value={calificacion} onValueChange={(v) => setCalificacion(v as CalificacionProveedor)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CALIFICACION_PROVEEDOR_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creando..." : "Crear proveedor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o contacto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={proveedoresColumns as ColumnDef<{ id: string }>[]}
          data={proveedores}
          onRowClick={(row: { id: string }) => router.push(`/proveedores/${row.id}`)}
        />
      )}
    </div>
  )
}
