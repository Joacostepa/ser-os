interface FunnelBarProps {
  label: string
  value: number
  width: string
  color: string
}

export function FunnelBar({ label, value, width, color }: FunnelBarProps) {
  return (
    <div className="flex items-center gap-3 mb-0.5">
      <span className="text-xs text-stone-500 w-36 shrink-0 text-right">{label}</span>
      <div className="flex-1">
        <div
          className="h-7 rounded-md flex items-center px-2.5"
          style={{ width, backgroundColor: color, minWidth: value > 0 ? "2rem" : 0 }}
        >
          <span className="text-xs font-medium text-white">{value}</span>
        </div>
      </div>
    </div>
  )
}
