import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { getCurrentUser } from "@/lib/actions/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen bg-stone-50">
      <AppSidebar user={user} />
      <div className="flex flex-1 flex-col ml-[220px]">
        <Header />
        <main className="flex-1 px-6 py-5 md:px-8">{children}</main>
      </div>
    </div>
  )
}
