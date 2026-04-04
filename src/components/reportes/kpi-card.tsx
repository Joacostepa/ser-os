import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  valueColor?: string
}

export function MetricCard({ label, value, subtitle, trend, trendValue, valueColor }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-muted/50 border p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-medium mt-1 ${valueColor || ""}`}>{value}</p>
      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 mt-1">
          {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
          {trend && trend !== "neutral" && (
            <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
              trend === "up" ? "text-green-600" : "text-red-600"
            }`}>
              {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendValue}
            </span>
          )}
          {trend === "neutral" && trendValue && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Minus className="h-3 w-3" /> {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
