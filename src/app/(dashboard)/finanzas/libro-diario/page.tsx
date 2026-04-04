"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react"
import { getLibroDiario } from "@/lib/actions/finanzas"
import { TIPO_ASIENTO_CONFIG } from "@/lib/constants"
import { formatearMontoCompleto } from "@/lib/formatters"

export default function LibroDiarioPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [asientos, setAsientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Filters
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroDesde, setFiltroDesde] = useState("")
  const [filtroHasta, setFiltroHasta] = useState("")

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const data = await getLibroDiario({
          tipo: filtroTipo !== "todos" ? filtroTipo : undefined,
          desde: filtroDesde || undefined,
          hasta: filtroHasta || undefined,
        })
        setAsientos(data || [])
      } catch {
        setAsientos([])
      }
      setLoading(false)
    }
    fetch()
  }, [filtroTipo, filtroDesde, filtroHasta])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function isBalanced(movimientos: { debe: number; haber: number }[]) {
    const totalDebe = movimientos.reduce((s, m) => s + Number(m.debe), 0)
    const totalHaber = movimientos.reduce((s, m) => s + Number(m.haber), 0)
    return Math.abs(totalDebe - totalHaber) < 0.01
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  const tipoKeys = Object.keys(TIPO_ASIENTO_CONFIG) as (keyof typeof TIPO_ASIENTO_CONFIG)[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Libro diario</h1>
        <p className="text-sm text-stone-400">Asientos contables del sistema</p>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">Tipo</Label>
          <Select value={filtroTipo} onValueChange={(v: string | null) => v && setFiltroTipo(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {tipoKeys.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>{TIPO_ASIENTO_CONFIG[tipo].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">Desde</Label>
          <Input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="w-[150px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">Hasta</Label>
          <Input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : asientos.length > 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-stone-500 w-8"></TableHead>
                <TableHead className="text-stone-500">#</TableHead>
                <TableHead className="text-stone-500">Fecha</TableHead>
                <TableHead className="text-stone-500">Descripción</TableHead>
                <TableHead className="text-stone-500">Tipo</TableHead>
                <TableHead className="text-stone-500 text-center">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {asientos.map((asiento: any) => {
                const isExpanded = expandedIds.has(asiento.id)
                const tipoConf = TIPO_ASIENTO_CONFIG[asiento.tipo as keyof typeof TIPO_ASIENTO_CONFIG]
                const balanced = isBalanced(asiento.movimientos || [])

                return (
                  <>
                    <TableRow
                      key={asiento.id}
                      className={`cursor-pointer ${asiento.anulado ? "opacity-50" : ""}`}
                      onClick={() => toggleExpanded(asiento.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon-xs" className="pointer-events-none">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-stone-600 font-mono">
                        {asiento.numero || asiento.id.toString().slice(0, 6)}
                      </TableCell>
                      <TableCell className="text-sm text-stone-600">
                        {formatFecha(asiento.fecha)}
                      </TableCell>
                      <TableCell className="text-sm text-stone-800">
                        {asiento.descripcion}
                        {asiento.anulado && (
                          <Badge className="ml-2 bg-red-50 text-red-600 text-xs">Anulado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tipoConf ? (
                          <Badge className={`${tipoConf.color} text-xs`}>
                            {tipoConf.label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{asiento.tipo}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {balanced ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && asiento.movimientos && (
                      <TableRow key={`${asiento.id}-detail`}>
                        <TableCell colSpan={6} className="bg-stone-50 px-8 py-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-stone-400">
                                <th className="text-left pb-2">Cuenta</th>
                                <th className="text-right pb-2">Debe</th>
                                <th className="text-right pb-2">Haber</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {asiento.movimientos.map((mov: any, idx: number) => (
                                <tr key={idx} className="border-t border-stone-100">
                                  <td className="py-1.5 text-stone-700">
                                    <span className="text-stone-400 text-xs mr-2 font-mono">{mov.cuenta?.codigo}</span>
                                    {mov.cuenta?.nombre}
                                  </td>
                                  <td className="py-1.5 text-right font-mono text-stone-700">
                                    {Number(mov.debe) > 0 ? formatearMontoCompleto(Number(mov.debe)) : ""}
                                  </td>
                                  <td className="py-1.5 text-right font-mono text-stone-700">
                                    {Number(mov.haber) > 0 ? formatearMontoCompleto(Number(mov.haber)) : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-stone-200 font-medium">
                                <td className="py-1.5 text-stone-800">Total</td>
                                <td className="py-1.5 text-right font-mono text-stone-800">
                                  {formatearMontoCompleto(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    asiento.movimientos.reduce((s: number, m: any) => s + Number(m.debe), 0)
                                  )}
                                </td>
                                <td className="py-1.5 text-right font-mono text-stone-800">
                                  {formatearMontoCompleto(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    asiento.movimientos.reduce((s: number, m: any) => s + Number(m.haber), 0)
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-stone-400 text-center py-12">No hay asientos en el período seleccionado</p>
      )}
    </div>
  )
}
