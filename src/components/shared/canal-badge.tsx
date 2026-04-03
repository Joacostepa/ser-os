import { Badge } from "@/components/ui/badge"

const CANAL_CONFIG = {
  mayorista: { label: "Mayorista", className: "bg-blue-100 text-blue-700" },
  minorista: { label: "Minorista", className: "bg-emerald-100 text-emerald-700" },
} as const

export function CanalBadge({ canal }: { canal: "mayorista" | "minorista" | null }) {
  if (!canal) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-500">
        Manual
      </Badge>
    )
  }

  const config = CANAL_CONFIG[canal]
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}
