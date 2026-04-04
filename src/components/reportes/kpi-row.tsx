interface KPIRowProps {
  label: React.ReactNode
  value: React.ReactNode
  bold?: boolean
}

export function KPIRow({ label, value, bold }: KPIRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-muted last:border-0">
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  )
}
