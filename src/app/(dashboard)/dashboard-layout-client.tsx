"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { PWAProvider } from "@/components/pwa/pwa-provider"
import { PushPrompt } from "@/components/pwa/push-prompt"
import { InstallPrompt } from "@/components/pwa/install-prompt"

interface DashboardLayoutClientProps {
  user: {
    nombre: string
    email: string
    rol: string
  } | null
  children: React.ReactNode
}

export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("sidebar-collapsed", String(next))
  }

  const sidebarWidth = collapsed ? 64 : 220

  return (
    <PWAProvider>
      <div className="flex min-h-screen bg-stone-50">
        <AppSidebar
          user={user}
          collapsed={collapsed}
          onToggle={toggle}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        {/*
          Content area: on mobile (< md), no left padding since sidebar is overlay.
          On desktop (>= md), padding-left matches the fixed sidebar width.
          We use a <style> block scoped via data-attribute for the media query,
          and inline the sidebar width as a CSS custom property for reactivity.
        */}
        <style>{`
          [data-dashboard-content] {
            padding-left: 0;
          }
          @media (min-width: 768px) {
            [data-dashboard-content] {
              padding-left: ${sidebarWidth}px;
              transition: padding-left 250ms cubic-bezier(0.4, 0, 0.2, 1);
            }
          }
        `}</style>
        <div
          className="flex flex-1 flex-col min-w-0"
          data-dashboard-content=""
        >
          <Header onMobileMenuOpen={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-4 md:px-6 md:py-5 lg:px-8">
            {children}
          </main>
        </div>
        <PushPrompt />
        <InstallPrompt />
      </div>
    </PWAProvider>
  )
}
