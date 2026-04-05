import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'ids requeridos' }, { status: 400 });
  }

  await supabase
    .from('notificaciones')
    .update({ enviada: true })
    .in('id', ids);

  return Response.json({ ok: true });
}
