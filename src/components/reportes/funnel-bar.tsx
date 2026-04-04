interface FunnelBarProps {
  label: string
  value: number
  width: string
  color: string
  highlight?: boolean
}

export function FunnelBar({ label, value, width, color, highlight }: FunnelBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0 text-right">{label}</span>
      <div className="flex-1 relative">
        <div
          className="h-7 rounded-md flex items-center px-2.5 transition-all"
          style={{ width, backgroundColor: color, minWidth: value > 0 ? "2rem" : 0 }}
        >
          <span className="text-xs font-medium text-white">{value}</span>
        </div>
      </div>
      {highlight && <span className="text-amber-500 text-sm">⚠️</span>}
    </div>
  )
}
