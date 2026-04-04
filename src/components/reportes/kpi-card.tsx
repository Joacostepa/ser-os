import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: number // percentage change vs prior period
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "danger"
}

const VARIANT_STYLES = {
  default: "",
  success: "border-green-200",
  warning: "border-amber-200",
  danger: "border-red-200",
}

export function KpiCard({ title, value, subtitle, trend, icon: Icon, variant = "default" }: KpiCardProps) {
  return (
    <Card className={VARIANT_STYLES[variant]}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          {trend !== undefined && trend !== null && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"
            }`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
