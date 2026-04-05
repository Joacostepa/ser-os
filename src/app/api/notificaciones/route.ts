import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const url = new URL(request.url)
  const leida = url.searchParams.get('leida')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  let query = supabase
    .from('notificaciones')
    .select('*', { count: 'exact' })
    .eq('usuario_id', usuario.id)
    .order('leida', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (leida === 'false') query = query.eq('leida', false)
  if (leida === 'true') query = query.eq('leida', true)

  const { data, count } = await query
  return Response.json({ data: data || [], total: count || 0 })
}
