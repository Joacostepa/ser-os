"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearMontoCompleto } from "@/lib/formatters"
import { ArrowLeft, AlertTriangle } from "lucide-react"

interface Sugerencia {
  id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  unidad: string
  proveedor_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proveedor: any
  cantidad_sugerida: number
}

export default function SugerenciasPage() {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data } = await supabase
        .from("insumos")
        .select(`
          id,
          nombre,
          stock_actual,
          stock_minimo,
          costo_unitario,
          unidad,
          proveedor_id,
          proveedor:proveedores(id, nombre)
        `)
        .eq("activo", true)
        .order("nombre")

      const items = (data ?? [])
        .filter((i) => Number(i.stock_actual) < Number(i.stock_minimo))
        .map((i) => ({
          ...i,
          cantidad_sugerida: Math.max(
            0,
            Number(i.stock_minimo) * 2 - Number(i.stock_actual)
          ),
        }))

      setSugerencias(items as Sugerencia[])
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/compras">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-medium text-stone-900">
            Sugerencias de reposicion
          </h1>
          <p className="text-sm text-stone-400">
            Insumos con stock por debajo del minimo
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : sugerencias.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
          <p className="text-sm text-stone-400">
            Todos los insumos tienen stock suficiente
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Stock actual</TableHead>
                <TableHead className="text-right">Stock minimo</TableHead>
                <TableHead className="text-right">Costo unitario</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">
                  Cantidad sugerida
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sugerencias.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/insumos/${item.id}`}
                      className="text-sm font-medium text-stone-800 hover:underline"
                    >
                      {item.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {item.stock_actual}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-stone-600">
                    {item.stock_minimo}
                  </TableCell>
                  <TableCell className="text-right font-mono text-stone-600">
                    {formatearMontoCompleto(Number(item.costo_unitario))}
                  </TableCell>
                  <TableCell>
                    {item.proveedor ? (
                      <Link
                        href={`/proveedores/${item.proveedor.id}`}
                        className="text-sm text-stone-600 hover:underline"
                      >
                        {item.proveedor.nombre}
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-300">---</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-stone-800">
                    {item.cantidad_sugerida} {item.unidad}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
