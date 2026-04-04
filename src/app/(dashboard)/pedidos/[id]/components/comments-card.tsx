"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardCard } from "@/components/reportes/dashboard-card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatearTiempoRelativo } from "@/lib/formatters"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CommentsCard({ comentarios, pedidoId }: { comentarios: any[]; pedidoId: string }) {
  const [contenido, setContenido] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const sorted = [...comentarios].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contenido.trim()) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_id", user.id)
        .single()

      if (!usuario) throw new Error("Usuario no encontrado")

      const { error } = await supabase.from("comentarios").insert({
        entidad_tipo: "pedido",
        entidad_id: pedidoId,
        usuario_id: usuario.id,
        contenido: contenido.trim(),
      })

      if (error) throw error
      setContenido("")
      router.refresh()
    } catch {
      toast.error("Error al enviar comentario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardCard title={`Comentarios internos (${comentarios.length})`}>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <Textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Escribir comentario..."
          className="min-h-[50px] resize-none text-sm"
          rows={2}
        />
        <Button type="submit" size="icon" disabled={loading || !contenido.trim()} className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs">{c.usuario?.nombre}</span>
                <span className="text-[11px] text-muted-foreground">{formatearTiempoRelativo(c.created_at)}</span>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">{c.contenido}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">Sin comentarios aún</p>
      )}
    </DashboardCard>
  )
}
