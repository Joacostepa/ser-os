"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { CotizacionDolar } from "@/components/shared/cotizacion-dolar"
import { NotificacionesBell } from "@/components/layout/notificaciones-bell"
import { CommandKTrigger } from "@/components/search/command-k-trigger"
import { CommandK } from "@/components/search/command-k"
import { usePathname } from "next/navigation"
import Link from "next/link"

const BREADCRUMB_LABELS: Record<string, string> = {
  pedidos: "Pedidos",
  tareas: "Tareas",
  productos: "Productos",
  clientes: "Clientes",
  pagos: "Pagos",
  configuracion: "Configuraci\u00f3n",
  usuarios: "Usuarios",
  plantillas: "Plantillas",
  integracion: "Integraci\u00f3n",
  proveedores: "Proveedores",
  compras: "Compras",
  insumos: "Insumos",
  nuevo: "Nuevo",
  nueva: "Nueva",
  recepcion: "Recepci\u00f3n",
  sugerencias: "Sugerencias",
  operaciones: "Operaciones",
  finanzas: "Finanzas",
  gastos: "Gastos",
  "cuentas-a-cobrar": "Cuentas a cobrar",
  "cuentas-a-pagar": "Cuentas a pagar",
  "estado-de-resultados": "Estado de resultados",
  "flujo-de-caja": "Flujo de caja",
  "libro-diario": "Libro diario",
  "plan-de-cuentas": "Plan de cuentas",
  notificaciones: "Notificaciones",
  comisiones: "Comisiones",
}

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <header className="flex h-12 items-center border-b border-stone-200 bg-white">
      {/* Desktop header */}
      <div className="hidden md:flex flex-1 items-center gap-3 px-6 lg:px-8">
        <nav className="flex-1 flex items-center text-sm">
          <Link
            href="/"
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            Inicio
          </Link>
          {segments.map((segment, index) => {
            const href = "/" + segments.slice(0, index + 1).join("/")
            const label = BREADCRUMB_LABELS[segment] || segment
            const isLast = index === segments.length - 1

            return (
              <span key={`${segment}-${index}`} className="flex items-center">
                <span className="mx-1.5 text-stone-300">/</span>
                {isLast ? (
                  <span className="text-stone-700 font-medium">{label}</span>
                ) : (
                  <Link
                    href={href}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>

        <CommandKTrigger onClick={() => setSearchOpen(true)} />

        <CotizacionDolar />

        <NotificacionesBell />
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden flex-1 items-center px-4">
        <button
          onClick={onMobileMenuOpen}
          className="text-stone-600 hover:text-stone-800 transition-colors p-1 -ml-1"
          aria-label="Abrir men\u00fa"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <span className="flex-1 text-center text-sm font-medium text-stone-700">
          SER Mayorista
        </span>

        <CommandKTrigger onClick={() => setSearchOpen(true)} />

        <NotificacionesBell />
      </div>

      <CommandK open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
