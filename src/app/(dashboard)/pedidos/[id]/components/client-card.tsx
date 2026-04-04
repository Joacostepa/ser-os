import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import Link from "next/link"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ClientCard({ cliente }: { cliente: any }) {
  if (!cliente) return null

  return (
    <DashboardCard title="Datos del cliente">
      <div className="space-y-0">
        <KPIRow
          label="Cliente"
          value={
            <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
              {cliente.nombre}
            </Link>
          }
        />
        {cliente.email && (
          <KPIRow label="Email" value={<a href={`mailto:${cliente.email}`} className="text-blue-600 hover:underline">{cliente.email}</a>} />
        )}
        {cliente.telefono && <KPIRow label="Teléfono" value={cliente.telefono} />}
        {cliente.cuit && <KPIRow label="CUIT" value={cliente.cuit} />}
      </div>
    </DashboardCard>
  )
}
