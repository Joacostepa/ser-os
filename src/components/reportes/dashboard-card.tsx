interface DashboardCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function DashboardCard({ title, description, children }: DashboardCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 md:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}
