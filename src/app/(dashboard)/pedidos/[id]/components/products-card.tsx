import { DashboardCard } from "@/components/reportes/dashboard-card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProductsCard({ items, montoTotal }: { items: any[]; montoTotal: number }) {
  return (
    <DashboardCard title={`Productos del pedido`} description={`${items.length} items · $${montoTotal.toLocaleString("es-AR")}`}>
      <div className="space-y-0">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-muted last:border-0">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs text-muted-foreground">{item.cantidad}x</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {item.descripcion || item.producto?.nombre || "Producto"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {item.variante?.nombre && <>{item.variante.nombre} · </>}
                x{item.cantidad} uds
              </p>
              {item.personalizacion && (
                <p className="text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mt-1 inline-block">
                  {typeof item.personalizacion === "object"
                    ? Object.entries(item.personalizacion).map(([k, v]) => `${k}: ${v}`).join(" · ")
                    : String(item.personalizacion)}
                </p>
              )}
            </div>
            <p className="text-sm font-medium tabular-nums shrink-0">
              ${Number(item.subtotal).toLocaleString("es-AR")}
            </p>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3 mt-1">
          <span className="text-sm font-medium">Total</span>
          <span className="text-[15px] font-medium tabular-nums">
            ${montoTotal.toLocaleString("es-AR")}
          </span>
        </div>
      </div>
    </DashboardCard>
  )
}
