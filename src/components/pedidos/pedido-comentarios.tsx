"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PedidoComentariosProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comentarios: any[]
  pedidoId: string
}

export function PedidoComentarios({ comentarios, pedidoId }: PedidoComentariosProps) {
  const [contenido, setContenido] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
      toast.error("Error al enviar el comentario")
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...comentarios].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No hay comentarios</p>
        )}

        {sorted.map((comentario) => {
          const initials = comentario.usuario?.nombre
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) ?? "?"

          return (
            <div key={comentario.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comentario.usuario?.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comentario.created_at), "dd MMM, HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{comentario.contenido}</p>
              </div>
            </div>
          )
        })}

        <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
          <Textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Escribí un comentario..."
            className="min-h-[60px] resize-none"
          />
          <Button type="submit" size="icon" disabled={loading || !contenido.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
