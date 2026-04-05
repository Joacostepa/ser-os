"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/marketing", label: "Dashboard" },
  { href: "/marketing/club-ser", label: "Club SER" },
  { href: "/marketing/campanas", label: "Campañas" },
  { href: "/marketing/cupones", label: "Cupones" },
  { href: "/marketing/configuracion", label: "Configuración" },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/marketing"
            ? pathname === "/marketing"
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-2 text-sm rounded-t-lg transition-colors ${
                active
                  ? "text-stone-900 font-medium border-b-2 border-stone-900 -mb-px"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
