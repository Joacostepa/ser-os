import { Search } from "lucide-react"
import { getConfiguracionEmpresa } from "@/lib/portal/config-empresa"

export default function PedidoNoEncontrado() {
  const config = getConfiguracionEmpresa()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="h-14 w-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <Search className="h-6 w-6 text-stone-400" />
      </div>

      <h1 className="text-lg font-medium text-stone-900 mb-2">
        Pedido no encontrado
      </h1>

      <p className="text-sm text-stone-500 max-w-[280px] mb-6">
        Verificá que el link de seguimiento sea correcto. Si el problema
        persiste, contactanos.
      </p>

      <a
        href={`mailto:${config.emailContacto}`}
        className="text-sm font-medium text-stone-700 underline underline-offset-2"
      >
        {config.emailContacto}
      </a>
    </div>
  )
}
