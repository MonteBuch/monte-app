import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://izpjmvgtrwxjmucebfyy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cGptdmd0cnd4am11Y2ViZnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzk3NjksImV4cCI6MjA4MDk1NTc2OX0.r9mcolZ5zCMmwjIO3mStZot8YUId_lbxjrvlfxJ_k3s";

// Request-Timeout: 15 Sekunden für normale Requests, 5 Minuten für Uploads
const REQUEST_TIMEOUT = 15000;
const UPLOAD_TIMEOUT = 5 * 60 * 1000; // 5 Minuten für große Dateien

// Custom fetch mit Timeout und frischen Verbindungen
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();

  // Storage-Uploads brauchen mehr Zeit (Videos können groß sein)
  const isStorageUpload = url.includes('/storage/v1/object/') && options.method === 'POST';
  const isEdgeFunction = url.includes('/functions/v1/');
  const timeout = isStorageUpload ? UPLOAD_TIMEOUT : REQUEST_TIMEOUT;

  const timeoutId = setTimeout(() => {
    const timeoutSec = timeout / 1000;
    console.warn(`[Supabase] Request timeout nach ${timeoutSec}s:`, url);
    controller.abort();
  }, timeout);

  if (isEdgeFunction) {
    // Edge Functions: Nur Timeout, keine zusätzlichen Headers
    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  }

  if (isStorageUpload) {
    // Storage Uploads: Längerer Timeout, keine Cache-Header
    console.log("[Supabase] Storage Upload gestartet (5 Min Timeout):", url.split('/').pop());
    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  }

  // Normale Requests: Cache-Header hinzufügen für frische Verbindungen
  const existingHeaders = options.headers || {};
  const newHeaders = new Headers(existingHeaders);
  newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  newHeaders.set('Pragma', 'no-cache');

  return fetch(url, {
    ...options,
    signal: controller.signal,
    cache: 'no-store',
    headers: newHeaders,
  }).finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 15000, // Heartbeat alle 15 Sekunden
    reconnectAfterMs: (tries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      return Math.min(1000 * Math.pow(2, tries), 30000);
    },
  },
});

if (typeof window !== "undefined") {
  window.supabase = supabase;
}