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

  const { endpoint, keys, user_agent } = await request.json();

  await supabase.from('push_subscriptions').upsert(
    {
      usuario_id: usuario.id,
      endpoint,
      keys_p256dh: keys.p256dh,
      keys_auth: keys.auth,
      user_agent: user_agent || null,
      activa: true,
    },
    { onConflict: 'usuario_id,endpoint' }
  );

  return Response.json({ ok: true });
}
