"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/reportes/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getCuentasACobrar } from "@/lib/actions/finanzas"
import { formatearMonto, formatearMontoCompleto } from "@/lib/formatters"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

const FRANJA_CONFIG: Record<string, { label: string; color: string }> = {
  "0-15": { label: "0-15d", color: "bg-green-50 text-green-700" },
  "16-30": { label: "16-30d", color: "bg-amber-50 text-amber-700" },
  "31-60": { label: "31-60d", color: "bg-orange-50 text-orange-700" },
  "60+": { label: "60+d", color: "bg-red-50 text-red-700" },
}

export default function CuentasACobrarPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cuentas, setCuentas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const data = await getCuentasACobrar()
        setCuentas(data || [])
      } catch {
        setCuentas([])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const totalACobrar = cuentas.reduce((s, c) => s + c.saldo, 0)
  const franja015 = cuentas.filter((c) => c.franja === "0-15").reduce((s, c) => s + c.saldo, 0)
  const franja1660 = cuentas.filter((c) => c.franja === "16-30" || c.franja === "31-60").reduce((s, c) => s + c.saldo, 0)
  const franja60plus = cuentas.filter((c) => c.franja === "60+").reduce((s, c) => s + c.saldo, 0)

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-stone-900">Cuentas a cobrar</h1>
        <p className="text-sm text-stone-400">Deuda de clientes por pedidos entregados</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total a cobrar"
              value={formatearMonto(totalACobrar)}
              subtitle={`${cuentas.length} pedidos`}
            />
            <MetricCard
              label="0-15 días"
              value={formatearMonto(franja015)}
              valueColor="text-green-700"
            />
            <MetricCard
              label="16-60 días"
              value={formatearMonto(franja1660)}
              valueColor="text-amber-600"
            />
            <MetricCard
              label="+60 días"
              value={formatearMonto(franja60plus)}
              valueColor="text-red-600"
            />
          </div>

          {cuentas.length > 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-stone-500"># Pedido</TableHead>
                    <TableHead className="text-stone-500">Fecha</TableHead>
                    <TableHead className="text-stone-500">Cliente</TableHead>
                    <TableHead className="text-stone-500 text-right">Total</TableHead>
                    <TableHead className="text-stone-500 text-right">Cobrado</TableHead>
                    <TableHead className="text-stone-500 text-right">Saldo</TableHead>
                    <TableHead className="text-stone-500">Antigüedad</TableHead>
                    <TableHead className="text-stone-500"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {cuentas.map((cuenta: any) => {
                    const franjaConf = FRANJA_CONFIG[cuenta.franja] || FRANJA_CONFIG["0-15"]
                    return (
                      <TableRow key={cuenta.id}>
                        <TableCell className="text-sm text-stone-800">
                          {cuenta.numero_tn || `#${cuenta.id.slice(0, 8)}`}
                        </TableCell>
                        <TableCell className="text-sm text-stone-600">
                          {formatFecha(cuenta.fecha)}
                        </TableCell>
                        <TableCell className="text-sm text-stone-800">
                          {cuenta.cliente}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-stone-700">
                            {formatearMontoCompleto(cuenta.total)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-green-700">
                            {formatearMontoCompleto(cuenta.cobrado)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-red-600">
                            {formatearMontoCompleto(cuenta.saldo)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${franjaConf.color} text-xs`}>
                            {franjaConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/pedidos/${cuenta.id}`}>
                            <Button variant="ghost" size="icon-sm">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-stone-400 text-center py-12">No hay cuentas a cobrar pendientes</p>
          )}
        </>
      )}
    </div>
  )
}
