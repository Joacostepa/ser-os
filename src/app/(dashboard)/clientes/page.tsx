"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { crearCliente } from "@/lib/actions/clientes"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"

const CATEGORIA_BADGE: Record<string, string> = {
  nuevo: "bg-blue-100 text-blue-700",
  recurrente: "bg-green-100 text-green-700",
  vip: "bg-amber-100 text-amber-700",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientesColumns: ColumnDef<any>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "telefono", header: "Teléfono" },
  { accessorKey: "cuit", header: "CUIT" },
  {
    accessorKey: "categoria",
    header: "Categoría",
    cell: ({ row }) => (
      <Badge variant="secondary" className={`capitalize ${CATEGORIA_BADGE[row.original.categoria] || ""}`}>
        {row.original.categoria}
      </Badge>
    ),
  },
  {
    accessorKey: "pedidos",
    header: "Pedidos",
    cell: ({ row }) => row.original.pedidos?.[0]?.count ?? 0,
  },
]

export default function ClientesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [cuit, setCuit] = useState("")
  const [categoria, setCategoria] = useState<"nuevo" | "recurrente" | "vip">("nuevo")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchClientes() {
      setLoading(true)
      let query = supabase
        .from("clientes")
        .select("*, pedidos(count)")
        .order("created_at", { ascending: false })

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
      }

      const { data } = await query
      setClientes(data || [])
      setLoading(false)
    }

    fetchClientes()
  }, [busqueda])

  async function handleCrearCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setSubmitting(true)
    try {
      await crearCliente({
        nombre: nombre.trim(),
        email: email || undefined,
        telefono: telefono || undefined,
        cuit: cuit || undefined,
        categoria,
      })
      toast.success("Cliente creado")
      setDialogOpen(false)
      setNombre("")
      setEmail("")
      setTelefono("")
      setCuit("")
      setCategoria("nuevo")
      // Re-fetch
      window.location.reload()
    } catch {
      toast.error("Error al crear el cliente")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestión de clientes mayoristas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo cliente
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrearCliente} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre / Razón social *</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CUIT</Label>
                  <Input value={cuit} onChange={(e) => setCuit(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="recurrente">Recurrente</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creando..." : "Crear cliente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
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
          columns={clientesColumns as ColumnDef<{ id: string }>[]}
          data={clientes}
          onRowClick={(row: { id: string }) => router.push(`/clientes/${row.id}`)}
        />
      )}
    </div>
  )
}
