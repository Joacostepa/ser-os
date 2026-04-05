import { Badge } from "@/components/ui/badge"
import { CONDICION_FISCAL_CONFIG } from "@/lib/constants"

type CondicionFiscal = keyof typeof CONDICION_FISCAL_CONFIG

export function CondicionFiscalBadge({ condicion }: { condicion?: string | null }) {
  if (!condicion) return null
  const config = CONDICION_FISCAL_CONFIG[condicion as CondicionFiscal]
  if (!config) return null
  return (
    <Badge variant="secondary" className={config.color}>
      {config.short}
    </Badge>
  )
}
