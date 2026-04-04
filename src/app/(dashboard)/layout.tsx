import { getCurrentUser } from "@/lib/actions/auth"
import { DashboardLayoutClient } from "./dashboard-layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
  )
}
