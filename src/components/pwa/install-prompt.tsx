'use client';

import { useState, useEffect } from 'react';
import { Share, Plus, X } from 'lucide-react';

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS()) return;
    if (isStandalone()) return;
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem('install-prompt-dismissed', 'true');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white border-t border-stone-200 shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900 text-sm">
            Instal&aacute; SER Mayorista
          </p>
          <p className="text-stone-500 text-xs mt-0.5 flex items-center gap-1 flex-wrap">
            Toc&aacute;{' '}
            <Share className="w-3.5 h-3.5 inline text-blue-500" />{' '}
            y despu&eacute;s &quot;Agregar a inicio&quot;{' '}
            <Plus className="w-3.5 h-3.5 inline text-stone-600" />
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
