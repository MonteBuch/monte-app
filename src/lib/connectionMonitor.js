// src/lib/connectionMonitor.js
// Überwacht die Supabase-Verbindung und zeigt Probleme an

import { supabase } from "../api/supabaseClient";

// Debug-Modus: true = Logging in Console
const DEBUG = true;

function log(message, data = null) {
  if (!DEBUG) return;
  const timestamp = new Date().toLocaleTimeString("de-DE");
  if (data) {
    console.log(`[ConnectionMonitor ${timestamp}] ${message}`, data);
  } else {
    console.log(`[ConnectionMonitor ${timestamp}] ${message}`);
  }
}

// Verbindungsstatus
let isOnline = navigator.onLine;
let lastActivityTime = Date.now();
let lastSuccessfulRequest = Date.now();
let realtimeStatus = "DISCONNECTED";
let monitorChannel = null;
let heartbeatInterval = null;
let healthCheckInterval = null;
let onStatusChange = null;
let isMonitorRunning = false;
let reconnectAttempts = 0;
let consecutiveFailures = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const MAX_CONSECUTIVE_FAILURES = 2;

// Status-Callback registrieren
export function setStatusChangeCallback(callback) {
  onStatusChange = callback;
}

// Aktuellen Status abrufen
export function getConnectionStatus() {
  return {
    isOnline,
    realtimeStatus,
    lastActivity: lastActivityTime,
    timeSinceActivity: Date.now() - lastActivityTime,
  };
}

// Aktivität registrieren (bei jeder DB-Interaktion aufrufen)
export function recordActivity() {
  lastActivityTime = Date.now();
}

// Erfolgreiche Anfrage registrieren
export function recordSuccessfulRequest() {
  lastSuccessfulRequest = Date.now();
  consecutiveFailures = 0;
}

// Fehlgeschlagene Anfrage registrieren
export function recordFailedRequest(error) {
  consecutiveFailures++;
  log(`Fehlgeschlagene Anfrage (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error?.message);

  // Bei zu vielen aufeinanderfolgenden Fehlern: Verbindungsproblem melden
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    log("Zu viele aufeinanderfolgende Fehler - Verbindungsproblem erkannt");
    handleConnectionLost();
  }
}

// Netzwerk-Status überwachen
function setupNetworkListeners() {
  window.addEventListener("online", () => {
    log("Netzwerk: ONLINE");
    isOnline = true;
    onStatusChange?.({ type: "network", status: "online" });

    // Bei Reconnect: Realtime neu verbinden
    reconnectRealtime();
  });

  window.addEventListener("offline", () => {
    log("Netzwerk: OFFLINE");
    isOnline = false;
    onStatusChange?.({ type: "network", status: "offline" });
  });

  // Visibility Change: Wenn Tab wieder aktiv wird
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      log("Tab wurde aktiviert - prüfe Verbindung");
      checkAndReconnect();
    }
  });
}

// Realtime-Verbindung überwachen
function setupRealtimeMonitor() {
  // Falls bereits ein Channel existiert, nicht neu erstellen
  if (monitorChannel) {
    log("Monitor-Channel existiert bereits");
    return;
  }

  // Monitor-Channel für Verbindungsstatus
  monitorChannel = supabase
    .channel("connection-monitor")
    .on("system", { event: "*" }, (payload) => {
      log("Realtime System Event:", payload);
    })
    .subscribe((status, err) => {
      const previousStatus = realtimeStatus;
      realtimeStatus = status;
      log(`Realtime Status: ${status}`, err ? { error: err } : null);

      onStatusChange?.({ type: "realtime", status, error: err });

      // Bei CLOSED: Das ist das kritische Problem!
      if (status === "CLOSED" && previousStatus === "SUBSCRIBED") {
        log("KRITISCH: Realtime-Verbindung wurde geschlossen!");
        handleConnectionLost();
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        log("Realtime Fehler - versuche Reconnect in 3s");
        setTimeout(reconnectRealtime, 3000);
      }
    });
}

// Verbindung verloren - versuche Recovery
async function handleConnectionLost() {
  reconnectAttempts++;
  log(`Verbindungsverlust - Versuch ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

  onStatusChange?.({
    type: "connection_lost",
    status: "recovering",
    attempt: reconnectAttempts
  });

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log("Max Reconnect-Versuche erreicht - empfehle Seiten-Reload");
    onStatusChange?.({
      type: "connection_lost",
      status: "failed",
      message: "Verbindung verloren. Bitte Seite neu laden."
    });
    return;
  }

  // Warte kurz, dann versuche Reconnect
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Session refreshen
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      log("Session-Refresh fehlgeschlagen:", refreshError);
    } else {
      log("Session erfolgreich refreshed");
    }

    // Realtime neu verbinden
    await reconnectRealtime();

    // Test ob es funktioniert
    const testResult = await testConnectionQuick();
    if (testResult.database?.ok) {
      log("Verbindung wiederhergestellt!");
      reconnectAttempts = 0;
      onStatusChange?.({ type: "connection_lost", status: "recovered" });
    } else {
      log("Verbindungstest nach Reconnect fehlgeschlagen");
      handleConnectionLost(); // Rekursiv nochmal versuchen
    }
  } catch (e) {
    log("Reconnect fehlgeschlagen:", e);
    handleConnectionLost(); // Rekursiv nochmal versuchen
  }
}

// Schneller Verbindungstest (mit Timeout)
async function testConnectionQuick() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    );

    const dbPromise = supabase
      .from("facilities")
      .select("id")
      .limit(1)
      .single();

    const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

    return {
      database: error ? { error: error.message } : { ok: true }
    };
  } catch (e) {
    return { database: { error: e.message } };
  }
}

// Auth-Events überwachen
function setupAuthMonitor() {
  supabase.auth.onAuthStateChange((event, session) => {
    log(`Auth Event: ${event}`, session ? { userId: session.user?.id } : null);

    if (event === "TOKEN_REFRESHED") {
      log("Token wurde erneuert");
      recordActivity();
      onStatusChange?.({ type: "auth", status: "token_refreshed" });
    } else if (event === "SIGNED_OUT") {
      log("User wurde ausgeloggt - stoppe Monitor");
      stopConnectionMonitor();
    } else if (event === "SIGNED_IN") {
      // Bei neuem Login die Aktivität aufzeichnen
      recordActivity();
    }
  });
}

// Realtime neu verbinden
async function reconnectRealtime() {
  log("Versuche Realtime-Reconnect...");

  try {
    // Alle Channels entfernen und neu verbinden
    const channels = supabase.getChannels();
    log(`Aktive Channels: ${channels.length}`);

    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }

    // Monitor-Channel neu erstellen
    setupRealtimeMonitor();

    log("Realtime-Reconnect erfolgreich");
    onStatusChange?.({ type: "reconnect", status: "success" });

    // Seite sollte neu geladen werden für volle Funktionalität
    // Das überlassen wir dem User oder machen es automatisch
  } catch (e) {
    log("Realtime-Reconnect fehlgeschlagen:", e);
    onStatusChange?.({ type: "reconnect", status: "failed", error: e });
  }
}

// Verbindung prüfen und bei Bedarf reconnecten
async function checkAndReconnect() {
  const timeSinceActivity = Date.now() - lastActivityTime;
  log(`Zeit seit letzter Aktivität: ${Math.round(timeSinceActivity / 1000)}s`);

  // Wenn länger als 5 Minuten inaktiv, Verbindung prüfen
  if (timeSinceActivity > 5 * 60 * 1000) {
    log("Lange Inaktivität - prüfe Session");

    try {
      // Session-Check mit 10 Sekunden Timeout
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        "Session-Check"
      );

      if (error) {
        log("Session-Fehler:", error);
        onStatusChange?.({ type: "session", status: "error", error });
        return;
      }

      if (!data.session) {
        log("Keine aktive Session");
        onStatusChange?.({ type: "session", status: "expired" });
        return;
      }

      log("Session ist aktiv", { userId: data.session.user?.id });
      recordActivity();

      // Realtime-Verbindung prüfen
      if (realtimeStatus !== "SUBSCRIBED") {
        reconnectRealtime();
      }
    } catch (e) {
      log("Fehler bei Session-Prüfung:", e.message);

      // Bei Timeout: Verbindungsproblem
      if (e.message.includes("Timeout")) {
        onStatusChange?.({
          type: "connection_lost",
          status: "failed",
          message: "Verbindung hängt. Bitte Seite neu laden."
        });
      }
    }
  }
}

// Heartbeat: Periodische Verbindungsprüfung
function startHeartbeat() {
  // Alle 30 Sekunden prüfen
  heartbeatInterval = setInterval(() => {
    if (document.visibilityState === "visible") {
      const timeSinceActivity = Date.now() - lastActivityTime;

      // Wenn länger als 2 Minuten inaktiv, leise prüfen
      if (timeSinceActivity > 2 * 60 * 1000) {
        checkAndReconnect();
      }
    }
  }, 30000);
}

// Timeout-Wrapper der sauber aufräumt
function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      log(`TIMEOUT bei ${label} nach ${ms}ms`);
      reject(new Error(`Timeout: ${label}`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Proaktiver Health-Check: Alle 60 Sekunden wenn Tab aktiv
function startHealthCheck() {
  healthCheckInterval = setInterval(async () => {
    // Nur prüfen wenn Tab sichtbar und online
    if (document.visibilityState !== "visible" || !isOnline) return;

    // Nur prüfen wenn länger als 30s seit letztem erfolgreichen Request
    const timeSinceSuccess = Date.now() - lastSuccessfulRequest;
    if (timeSinceSuccess < 30000) return;

    log("Proaktiver Health-Check...");

    try {
      const start = Date.now();

      // Health-Check mit 10 Sekunden Timeout
      const { error } = await withTimeout(
        supabase.from("facilities").select("id").limit(1).single(),
        10000,
        "Health-Check"
      );

      if (error) {
        log("Health-Check fehlgeschlagen:", error.message);
        recordFailedRequest(error);
      } else {
        const latency = Date.now() - start;
        log(`Health-Check OK (${latency}ms)`);
        recordSuccessfulRequest();
      }
    } catch (e) {
      log("Health-Check Exception:", e.message);
      recordFailedRequest(e);

      // Bei Timeout: Sofort Verbindungsproblem melden
      if (e.message.includes("Timeout")) {
        onStatusChange?.({
          type: "connection_lost",
          status: "failed",
          message: "Verbindung hängt. Bitte Seite neu laden."
        });
      }
    }
  }, 30000); // Alle 30 Sekunden (vorher 60)
}

// Test-Funktion für manuelle Verbindungsprüfung
export async function testConnection() {
  log("=== Manuelle Verbindungsprüfung ===");

  const results = {
    network: navigator.onLine,
    timestamp: new Date().toISOString(),
  };

  // 1. Auth-Session prüfen (mit 5s Timeout)
  try {
    log("Prüfe Auth-Session...");
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      5000,
      "getSession"
    );
    results.session = error ? { error: error.message } : {
      valid: !!data.session,
      userId: data.session?.user?.id,
      expiresAt: data.session?.expires_at
    };
    log("Auth-Session OK:", results.session);
  } catch (e) {
    results.session = { error: e.message, timeout: e.message.includes("Timeout") };
    log("Auth-Session FEHLER:", e.message);
  }

  // 2. Einfache DB-Abfrage (mit 5s Timeout)
  try {
    log("Prüfe Datenbank...");
    const start = Date.now();
    const { data, error } = await withTimeout(
      supabase.from("facilities").select("id").limit(1).single(),
      5000,
      "DB-Query"
    );

    if (error) {
      results.database = { error: error.message };
      recordFailedRequest(error);
    } else {
      results.database = { ok: true, latency: Date.now() - start };
      recordSuccessfulRequest();
    }
    log("Datenbank OK:", results.database);
  } catch (e) {
    results.database = { error: e.message, timeout: e.message.includes("Timeout") };
    log("Datenbank FEHLER:", e.message);
    recordFailedRequest(e);

    // Bei Timeout oder AbortError: Verbindung ist definitiv kaputt
    if (e.message.includes("Timeout") || e.name === "AbortError") {
      onStatusChange?.({
        type: "connection_lost",
        status: "failed",
        message: "Verbindung hängt. Bitte Seite neu laden."
      });
    }
  }

  // 3. Realtime-Status
  results.realtime = {
    status: realtimeStatus,
    channels: supabase.getChannels().length
  };

  log("Verbindungstest Ergebnis:", results);
  return results;
}

// Monitor starten
export function startConnectionMonitor() {
  // Verhindere mehrfaches Starten
  if (isMonitorRunning) {
    log("Monitor läuft bereits - überspringe Start");
    return;
  }

  isMonitorRunning = true;
  reconnectAttempts = 0;
  consecutiveFailures = 0;
  lastSuccessfulRequest = Date.now();
  log("Connection Monitor gestartet");

  setupNetworkListeners();
  setupRealtimeMonitor();
  setupAuthMonitor();
  startHeartbeat();
  startHealthCheck();

  // Initial testen
  setTimeout(testConnection, 2000);
}

// Monitor stoppen
export function stopConnectionMonitor() {
  if (!isMonitorRunning) return;

  isMonitorRunning = false;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (monitorChannel) {
    supabase.removeChannel(monitorChannel);
    monitorChannel = null;
  }
  log("Connection Monitor gestoppt");
}

// Global verfügbar machen für Debug
if (typeof window !== "undefined") {
  window.connectionMonitor = {
    test: testConnection,
    status: () => ({
      ...getConnectionStatus(),
      consecutiveFailures,
      lastSuccessfulRequest: new Date(lastSuccessfulRequest).toLocaleTimeString("de-DE"),
      timeSinceSuccess: Math.round((Date.now() - lastSuccessfulRequest) / 1000) + "s",
      realtimeStatus,
    }),
    reconnect: reconnectRealtime,
    forceCheck: async () => {
      log("Erzwungener Health-Check...");
      try {
        const { error } = await supabase.from("facilities").select("id").limit(1).single();
        if (error) {
          recordFailedRequest(error);
          return { ok: false, error: error.message };
        }
        recordSuccessfulRequest();
        return { ok: true };
      } catch (e) {
        recordFailedRequest(e);
        return { ok: false, error: e.message };
      }
    },
  };
}
