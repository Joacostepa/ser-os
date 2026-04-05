import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Get usuario_id from usuarios table
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  if (!usuario) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const { endpoint } = await request.json();

  await supabase
    .from('push_subscriptions')
    .update({ activa: false })
    .eq('usuario_id', usuario.id)
    .eq('endpoint', endpoint);

  return Response.json({ ok: true });
}
