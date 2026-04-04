import { DashboardCard } from "@/components/reportes/dashboard-card"
import { KPIRow } from "@/components/reportes/kpi-row"
import { Badge } from "@/components/ui/badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ShippingCard({ pedido }: { pedido: any }) {
  const tipoDespacho = pedido.tipo_despacho
  const datosEnvio = pedido.datos_envio

  return (
    <DashboardCard title="Envío / Retiro">
      <div className="space-y-0">
        <KPIRow
          label="Método"
          value={
            tipoDespacho === "envio"
              ? <Badge variant="secondary" className="bg-[#E6F1FB] text-[#185FA5] border-0">Envío</Badge>
              : <Badge variant="secondary" className="bg-muted">Retiro en oficina</Badge>
          }
        />
        {datosEnvio && typeof datosEnvio === "object" && (
          <>
            {datosEnvio.address && <KPIRow label="Dirección" value={String(datosEnvio.address)} />}
            {datosEnvio.city && <KPIRow label="Ciudad" value={`${datosEnvio.city}, ${datosEnvio.province || ""}`} />}
            {datosEnvio.zipcode && <KPIRow label="CP" value={String(datosEnvio.zipcode)} />}
          </>
        )}
        {pedido.codigo_seguimiento && (
          <KPIRow label="Código seguimiento" value={pedido.codigo_seguimiento} />
        )}
      </div>
      {!["armado_completo", "pendiente_saldo", "listo_para_despacho", "en_preparacion_envio", "despachado", "cerrado"].includes(pedido.estado_interno) && (
        <p className="text-[11px] text-muted-foreground mt-2">Se completará al despachar</p>
      )}
    </DashboardCard>
  )
}
