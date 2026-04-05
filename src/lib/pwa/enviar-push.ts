"use server"

import webPush from 'web-push';
import { createClient } from "@/lib/supabase/server";

// Configure VAPID - use lazy init to avoid errors when env vars not set
let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contacto@sermayorista.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  notificacion_id?: string;
}

export async function enviarPush(usuarioId: string, payload: PushPayload) {
  ensureVapidConfigured();
  if (!vapidConfigured) return;

  const supabase = await createClient();
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activa', true);

  if (!subs?.length) return;

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        JSON.stringify(payload)
      );
    } catch (error: unknown) {
      const pushError = error as { statusCode?: number };
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .update({ activa: false })
          .eq('id', sub.id);
      }
    }
  }
}
