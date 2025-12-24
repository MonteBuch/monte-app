// src/components/ui/UpdatePrompt.jsx
// Zeigt Banner wenn eine neue App-Version verfügbar ist

import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Alle 60 Sekunden nach Updates suchen
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  const update = () => {
    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-in">
      <div className="bg-amber-500 text-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <RefreshCw size={20} className="flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm">Neue Version verfügbar</p>
          <p className="text-xs opacity-90">Jetzt aktualisieren für neue Features</p>
        </div>
        <button
          onClick={update}
          className="bg-white text-amber-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
        >
          Update
        </button>
        <button
          onClick={close}
          className="text-white/80 hover:text-white p-1"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
