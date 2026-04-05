import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  valueColor?: string
  usdValue?: string
}

export function MetricCard({ label, value, subtitle, trend, trendValue, valueColor, usdValue }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className={`text-2xl font-medium font-mono ${valueColor || "text-stone-900"}`}>{value}</p>
      {usdValue && (
        <p className="text-xs font-mono text-stone-400 mt-0.5">{usdValue}</p>
      )}
      {(subtitle || (trend && trend !== "neutral")) && (
        <div className="flex items-center gap-1.5 mt-1">
          {trend === "up" && trendValue && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
              <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
              {trendValue}
            </span>
          )}
          {trend === "down" && trendValue && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
              <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-stone-400">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
