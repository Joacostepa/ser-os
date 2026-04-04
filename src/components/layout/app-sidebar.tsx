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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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
  { label: "Insumos", href: "/insumos", icon: Boxes },
]

const CONFIG_ITEMS = [
  { label: "Configuración", href: "/configuracion", icon: Settings },
]

interface AppSidebarProps {
  user: {
    nombre: string
    email: string
    rol: string
  } | null
}

export function AppSidebar({ user }: AppSidebarProps) {
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

  const initials = user?.nombre
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-[220px] bg-stone-50 border-r border-stone-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white">
          <PackageOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-stone-900">SER Mayorista</span>
          <span className="text-xs text-stone-400">Sistema de Gestión</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium px-3 pt-2 pb-1">Menú</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-colors ${
                    active
                      ? "font-medium text-stone-900 bg-stone-200/70"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-stone-600" : "text-stone-400"}`} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {user?.rol === "admin" && (
          <>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium px-3 pt-4 pb-1">Administración</p>
            <ul className="space-y-0.5">
              {CONFIG_ITEMS.map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-colors ${
                        active
                          ? "font-medium text-stone-900 bg-stone-200/70"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${active ? "text-stone-600" : "text-stone-400"}`} strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-stone-200 text-stone-600 text-xs font-medium flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-stone-700">{user?.nombre}</span>
            <span className="truncate text-xs text-stone-400 capitalize">{user?.rol}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-stone-400 hover:text-stone-600 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  )
}
