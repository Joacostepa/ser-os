"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  CheckSquare,
  Users,
  CreditCard,
  Package,
  Settings,
  PackageOpen,
  LogOut,
  Truck,
  ShoppingBag,
  Boxes,
  Zap,
  Wallet,
  Receipt,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { MENU_POR_ROL } from "@/lib/auth/permisos"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Operaciones", href: "/operaciones", icon: Zap },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart },
  { label: "Tareas", href: "/tareas", icon: CheckSquare },
  { label: "Productos", href: "/productos", icon: Package },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Pagos", href: "/pagos", icon: CreditCard },
  { label: "Proveedores", href: "/proveedores", icon: Truck },
  { label: "Compras", href: "/compras", icon: ShoppingBag },
  { label: "Gastos", href: "/gastos", icon: Receipt },
  { label: "Insumos", href: "/insumos", icon: Boxes },
  { label: "Marketing", href: "/marketing", icon: Megaphone },
  { label: "Finanzas", href: "/finanzas", icon: Wallet },
]

const CONFIG_ITEMS = [
  { label: "Configuraci\u00f3n", href: "/configuracion", icon: Settings },
]

interface AppSidebarProps {
  user: {
    nombre: string
    email: string
    rol: string
  } | null
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavItem({
  item,
  active,
  collapsed,
  isMobile,
  onMobileClose,
}: {
  item: (typeof NAV_ITEMS)[number]
  active: boolean
  collapsed: boolean
  isMobile: boolean
  onMobileClose: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const effectiveCollapsed = isMobile ? false : collapsed

  return (
    <li className="relative">
      <Link
        href={item.href}
        onClick={isMobile ? onMobileClose : undefined}
        onMouseEnter={() => {
          if (effectiveCollapsed) setShowTooltip(true)
        }}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2.5 py-2 px-3 rounded-lg transition-colors"
        style={{
          justifyContent: effectiveCollapsed ? "center" : "flex-start",
          color: active ? "#e8e6df" : "#a0b0a2",
          backgroundColor: active
            ? "rgba(255,255,255,0.12)"
            : "transparent",
          fontWeight: active ? 500 : 400,
          fontSize: "13px",
        }}
        onMouseOver={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"
          }
        }}
        onMouseOut={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "transparent"
          }
        }}
      >
        <item.icon
          className="shrink-0"
          style={{
            width: 18,
            height: 18,
            color: active ? "#c4d4c6" : "#8a9a8c",
          }}
          strokeWidth={1.5}
        />
        <span
          className="whitespace-nowrap transition-all duration-200"
          style={{
            overflow: "hidden",
            width: effectiveCollapsed ? 0 : "auto",
            opacity: effectiveCollapsed ? 0 : 1,
          }}
        >
          {item.label}
        </span>
      </Link>
      {/* Tooltip in collapsed mode */}
      {effectiveCollapsed && showTooltip && (
        <div
          className="fixed z-[100] px-2 py-1 rounded text-xs text-white pointer-events-none"
          style={{
            left: 68,
            top: "auto",
            backgroundColor: "#1c1917",
            transform: "translateY(-50%)",
            marginTop: -1,
          }}
          ref={(el) => {
            if (el && el.parentElement) {
              const linkRect =
                el.parentElement.querySelector("a")?.getBoundingClientRect()
              if (linkRect) {
                el.style.top = `${linkRect.top + linkRect.height / 2}px`
              }
            }
          }}
        >
          {item.label}
        </div>
      )}
    </li>
  )
}

export function AppSidebar({
  user,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials =
    user?.nombre
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?"

  const userRol = user?.rol || "lectura"
  const allowedLabels = MENU_POR_ROL[userRol] || []
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => userRol === "admin" || allowedLabels.includes(item.label)
  )
  const showConfig =
    userRol === "admin" || allowedLabels.includes("Configuracion")

  const sidebarContent = (isMobile: boolean) => {
    const effectiveCollapsed = isMobile ? false : collapsed

    return (
      <>
        {/* Header */}
        <div
          className="flex items-center px-4 py-4"
          style={{
            justifyContent: effectiveCollapsed ? "center" : "flex-start",
            gap: effectiveCollapsed ? 0 : 8,
          }}
        >
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#576259",
            }}
          >
            <PackageOpen
              style={{ width: 16, height: 16, color: "#e8e6df" }}
              strokeWidth={1.5}
            />
          </div>
          <div
            className="flex flex-col overflow-hidden transition-all duration-200"
            style={{
              width: effectiveCollapsed ? 0 : "auto",
              opacity: effectiveCollapsed ? 0 : 1,
            }}
          >
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: "#e8e6df" }}
            >
              SER Mayorista
            </span>
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: "#6b7b6d" }}
            >
              Sistema de gesti&oacute;n
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {!effectiveCollapsed && (
            <p
              className="text-[10px] uppercase tracking-wider font-medium px-3 pt-2 pb-1"
              style={{ color: "#6b7b6d" }}
            >
              Men&uacute;
            </p>
          )}
          <ul className="space-y-0.5">
            {visibleNavItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
                isMobile={isMobile}
                onMobileClose={onMobileClose}
              />
            ))}
          </ul>

          {showConfig && (
            <>
              {!effectiveCollapsed && (
                <p
                  className="text-[10px] uppercase tracking-wider font-medium px-3 pt-4 pb-1"
                  style={{ color: "#6b7b6d" }}
                >
                  Administraci&oacute;n
                </p>
              )}
              {effectiveCollapsed && <div className="pt-3" />}
              <ul className="space-y-0.5">
                {CONFIG_ITEMS.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    isMobile={isMobile}
                    onMobileClose={onMobileClose}
                  />
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Footer */}
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="flex items-center"
            style={{
              justifyContent: effectiveCollapsed ? "center" : "flex-start",
              gap: effectiveCollapsed ? 0 : 8,
            }}
          >
            <div
              className="h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#576259", color: "#e8e6df" }}
            >
              {initials}
            </div>
            <div
              className="flex flex-1 flex-col overflow-hidden transition-all duration-200"
              style={{
                width: effectiveCollapsed ? 0 : "auto",
                opacity: effectiveCollapsed ? 0 : 1,
              }}
            >
              <span
                className="truncate text-sm font-medium"
                style={{ color: "#e8e6df" }}
              >
                {user?.nombre}
              </span>
              <span
                className="truncate text-xs capitalize"
                style={{ color: "#6b7b6d" }}
              >
                {user?.rol}
              </span>
            </div>
            {!effectiveCollapsed && (
              <button
                onClick={handleSignOut}
                className="transition-colors p-1"
                style={{ color: "#6b7b6d" }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = "#a0b0a2"
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = "#6b7b6d"
                }}
                title="Cerrar sesi&oacute;n"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden md:flex flex-col"
        style={{
          width: collapsed ? 64 : 220,
          backgroundColor: "#3d4a3e",
          transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {sidebarContent(false)}

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute flex items-center justify-center"
          style={{
            top: 28,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: "#3d4a3e",
            border: "2px solid #fafaf7",
            color: "#e8e6df",
            cursor: "pointer",
            zIndex: 40,
            transition: "background-color 150ms",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#4a584c"
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#3d4a3e"
          }}
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <ChevronRight style={{ width: 14, height: 14 }} strokeWidth={2} />
          ) : (
            <ChevronLeft style={{ width: 14, height: 14 }} strokeWidth={2} />
          )}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col md:hidden"
        style={{
          width: 280,
          backgroundColor: "#3d4a3e",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {sidebarContent(true)}
      </aside>
    </>
  )
}
