interface DashboardCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function DashboardCard({ title, description, children }: DashboardCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-stone-800">{title}</h3>
        {description && <p className="text-xs text-stone-400 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}
