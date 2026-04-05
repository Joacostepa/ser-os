"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { DataTable } from "@/components/shared/data-table"
import { getCampanas, prepararCampana } from "@/lib/actions/marketing"
import { formatearMonto } from "@/lib/formatters"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"

const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  lista: "bg-blue-100 text-blue-700",
  aprobada: "bg-green-100 text-green-700",
  ejecutada: "bg-violet-100 text-violet-700",
  completada: "bg-teal-100 text-teal-700",
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  lista: "Lista",
  aprobada: "Aprobada",
  ejecutada: "Ejecutada",
  completada: "Completada",
}

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const campanasColumns: ColumnDef<any>[] = [
  {
    accessorKey: "nombre",
    header: "Mes / Ano",
    cell: ({ row }) => (
      <span className="font-medium text-stone-800">
        {row.original.nombre ?? `${row.original.mes}/${row.original.anio}`}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant="secondary" className={ESTADO_BADGE[row.original.estado] ?? ""}>
        {ESTADO_LABEL[row.original.estado] ?? row.original.estado}
      </Badge>
    ),
  },
  {
    accessorKey: "cupones_count",
    header: "Cupones",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-600">{row.original.cupones_count}</span>
    ),
  },
  {
    accessorKey: "tasa_conversion",
    header: "Conversion",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-stone-600">{row.original.tasa_conversion}%</span>
    ),
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-green-700">
        {formatearMonto(row.original.revenue)}
      </span>
    ),
  },
  {
    id: "acciones",
    header: "",
    cell: () => (
      <span className="text-xs text-stone-400">Ver &rarr;</span>
    ),
  },
]

export default function CampanasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campanas, setCampanas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const result = await getCampanas()
        setCampanas(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  async function handlePreparar(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await prepararCampana(Number(mes), Number(anio))
      toast.success("Campana preparada exitosamente")
      setDialogOpen(false)
      // Reload campaigns
      const result = await getCampanas()
      setCampanas(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al preparar la campana")
    } finally {
      setSubmitting(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-stone-900">Campanas</h1>
          <p className="text-sm text-stone-400">Campanas mensuales del Club SER</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" />
            Preparar campana
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Preparar nueva campana</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePreparar} className="space-y-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={mes} onValueChange={(v: string | null) => v && setMes(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  min={currentYear - 1}
                  max={currentYear + 1}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? "Preparando..." : "Preparar campana"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={campanasColumns as ColumnDef<{ id: string }>[]}
          data={campanas}
          onRowClick={(row: { id: string }) => router.push(`/marketing/campanas/${row.id}`)}
        />
      )}
    </div>
  )
}
