"use client"

import { Bell } from "lucide-react"
import { CotizacionDolar } from "@/components/shared/cotizacion-dolar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

const BREADCRUMB_LABELS: Record<string, string> = {
  pedidos: "Pedidos",
  tareas: "Tareas",
  productos: "Productos",
  clientes: "Clientes",
  pagos: "Pagos",
  configuracion: "Configuración",
  usuarios: "Usuarios",
  plantillas: "Plantillas",
  integracion: "Integración",
  proveedores: "Proveedores",
  compras: "Compras",
  insumos: "Insumos",
  reportes: "Reportes",
}

export function Header() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <header className="flex h-14 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />

      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          {segments.map((segment, index) => {
            const href = "/" + segments.slice(0, index + 1).join("/")
            const label = BREADCRUMB_LABELS[segment] || segment
            const isLast = index === segments.length - 1

            return (
              <span key={segment} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <CotizacionDolar />
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  )
}
