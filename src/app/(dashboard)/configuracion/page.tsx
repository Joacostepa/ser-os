import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Plug } from "lucide-react"
import Link from "next/link"

const CONFIG_SECTIONS = [
  {
    title: "Usuarios",
    description: "Gestión de usuarios internos y roles",
    href: "/configuracion/usuarios",
    icon: Users,
  },
  {
    title: "Plantillas de tareas",
    description: "Templates de tareas por tipo de pedido",
    href: "/configuracion/plantillas",
    icon: FileText,
  },
  {
    title: "Integración Tienda Nube",
    description: "Configuración de API y webhooks",
    href: "/configuracion/integracion",
    icon: Plug,
  },
]

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Administración del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CONFIG_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
