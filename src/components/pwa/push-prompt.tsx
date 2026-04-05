'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { suscribirAPush } from '@/lib/pwa/push-subscription';

export function PushPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('push-prompt-dismissed');
    if (dismissed) return;

    if (!('PushManager' in window)) return;

    // Check if already subscribed
    navigator.serviceWorker?.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) return; // Already subscribed
        // Show after 3 seconds
        const timer = setTimeout(() => setVisible(true), 3000);
        return () => clearTimeout(timer);
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  const handleActivar = async () => {
    const ok = await suscribirAPush();
    if (ok) {
      toast.success('Notificaciones activadas');
    } else {
      toast.error('No se pudieron activar las notificaciones');
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push-prompt-dismissed', 'true');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-white border border-stone-200 shadow-lg rounded-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3d4a3e] flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900 text-sm">
            Activar notificaciones?
          </p>
          <p className="text-stone-500 text-xs mt-0.5">
            Recib&iacute; alertas de pedidos nuevos, pagos y tareas aunque no tengas la app abierta.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleActivar}
              className="px-3 py-1.5 bg-[#3d4a3e] text-white text-xs font-medium rounded-lg hover:bg-[#2e3a2f] transition-colors"
            >
              Activar
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-medium rounded-lg hover:bg-stone-200 transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
