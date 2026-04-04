"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/finanzas", label: "Resumen" },
  { href: "/finanzas/cuentas-a-cobrar", label: "Cuentas a cobrar" },
  { href: "/finanzas/cuentas-a-pagar", label: "Cuentas a pagar" },
  { href: "/finanzas/gastos", label: "Gastos" },
  { href: "/finanzas/estado-de-resultados", label: "Estado de resultados" },
  { href: "/finanzas/flujo-de-caja", label: "Flujo de caja" },
  { href: "/finanzas/libro-diario", label: "Libro diario" },
  { href: "/finanzas/plan-de-cuentas", label: "Plan de cuentas" },
]

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/finanzas"
            ? pathname === "/finanzas"
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
