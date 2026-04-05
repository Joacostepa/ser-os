import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const { ids } = await request.json()

  if (ids === 'all') {
    await supabase
      .from('notificaciones')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('usuario_id', usuario.id)
      .eq('leida', false)

    return Response.json({ ok: true })
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'ids requeridos (array o "all")' }, { status: 400 })
  }

  await supabase
    .from('notificaciones')
    .update({ leida: true, leida_at: new Date().toISOString() })
    .eq('usuario_id', usuario.id)
    .in('id', ids)

  return Response.json({ ok: true })
}
