import { Badge } from "@/components/ui/badge"

const CANAL_CONFIG: Record<string, { label: string; className: string }> = {
  tienda_nube: { label: "Mayorista", className: "bg-blue-100 text-blue-700" },
  manual: { label: "Manual", className: "bg-stone-100 text-stone-600" },
  whatsapp: { label: "WhatsApp", className: "bg-green-100 text-green-700" },
  instagram: { label: "Instagram", className: "bg-purple-100 text-purple-700" },
  telefono: { label: "Telefono", className: "bg-amber-100 text-amber-700" },
  email: { label: "Email", className: "bg-sky-100 text-sky-700" },
  // Legacy tienda canal values
  mayorista: { label: "Mayorista", className: "bg-blue-100 text-blue-700" },
  minorista: { label: "Minorista", className: "bg-emerald-100 text-emerald-700" },
}

export function CanalBadge({ canal, tiendaCanal }: { canal?: string | null; tiendaCanal?: string | null }) {
  // For TN orders, show the tienda sub-type (mayorista/minorista) if available
  const displayCanal = canal === "tienda_nube" && tiendaCanal ? tiendaCanal : (canal || null)

  if (!displayCanal) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-500">
        —
      </Badge>
    )
  }

  const config = CANAL_CONFIG[displayCanal] || { label: displayCanal, className: "bg-gray-100 text-gray-500" }
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}
