import { TrendingUp, TrendingDown } from "lucide-react"

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
    <div className="rounded-xl bg-stone-100 px-4 py-3.5">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={`text-2xl font-medium ${valueColor || "text-stone-900"}`}>{value}</p>
      {(subtitle || (trend && trend !== "neutral")) && (
        <div className="flex items-center gap-1.5 mt-1">
          {subtitle && <span className="text-xs text-stone-500">{subtitle}</span>}
          {trend === "up" && trendValue && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-green-700">
              <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
              {trendValue}
            </span>
          )}
          {trend === "down" && trendValue && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
              <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
