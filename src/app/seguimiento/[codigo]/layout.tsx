export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[480px] mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
