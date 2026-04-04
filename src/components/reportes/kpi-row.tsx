interface KPIRowProps {
  label: React.ReactNode
  value: React.ReactNode
  bold?: boolean
}

export function KPIRow({ label, value, bold }: KPIRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <span className={`text-sm ${bold ? "font-medium text-stone-800" : "text-stone-500"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-medium text-stone-800" : "text-stone-700"}`}>{value}</span>
    </div>
  )
}
