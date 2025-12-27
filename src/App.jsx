// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Home,
  Users,
  UtensilsCrossed,
  CalendarDays,
  Calendar as CalendarIcon,
  User as UserIcon,
  Settings as SettingsIcon,
  Loader2,
  Cake,
  CheckCircle,
  Sprout,
  MessageCircle,
  Menu,
  Mail,
  X,
} from "lucide-react";

import { supabase } from "./api/supabaseClient";
import { GroupsProvider } from "./context/GroupsContext";
import { FacilityProvider, useFacility } from "./context/FacilityContext";
import { ThemeProvider } from "./context/ThemeContext";
import {
  registerPushNotifications,
  removePushToken,
  setupPushListeners,
  cleanupPushListeners,
} from "./lib/pushNotifications";
import {
  startConnectionMonitor,
  stopConnectionMonitor,
  setStatusChangeCallback,
  testConnection,
} from "./lib/connectionMonitor";

import AuthScreen from "./components/Auth/AuthScreen";
import ForceReset from "./components/Auth/ForceReset";

import News from "./components/news/News";
import GroupArea from "./components/group/GroupArea";
import FoodPlan from "./components/food/FoodPlan";

import AbsenceReport from "./components/absence/AbsenceReport";
import AbsenceTeamWrapper from "./components/absence/AbsenceTeamWrapper";
import AdminAbsenceDashboard from "./components/absence/AdminAbsenceDashboard";

import ProfileHome from "./components/profile/ProfileHome";
import ProfileChildren from "./components/profile/ProfileChildren";
import ProfileNotifications from "./components/profile/ProfileNotifications";
import ProfileFacility from "./components/profile/ProfileFacility";
import ProfileSecurity from "./components/profile/ProfileSecurity";
import ProfileCustomize from "./components/profile/ProfileCustomize";
import AdminChildrenRecords from "./components/admin/AdminChildrenRecords";
import CalendarView from "./components/calendar/CalendarView";
import GroupChat from "./components/chat/GroupChat";

import AdminArea from "./components/admin/AdminArea";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallPrompt from "./components/ui/InstallPrompt";
import UpdatePrompt from "./components/ui/UpdatePrompt";
import MoreMenu, { ALL_TABS, DEFAULT_TABS } from "./components/ui/MoreMenu";
import WelcomeScreen from "./components/ui/WelcomeScreen";
import { hasTodayBirthdaysForUser } from "./lib/notificationTriggers";

// --------------------------------------------------
// Hilfs-Komponenten: Header & Footer
// --------------------------------------------------

const AppHeader = ({ user, facilityName, facilityLogo }) => {
  if (!user) return null;

  const displayName = user.name || user.username || "";
  let roleLabel = null;

  if (user.role === "team") roleLabel = "Team";
  if (user.role === "admin") roleLabel = "Leitung";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo: Custom oder Default */}
          {facilityLogo ? (
            <img
              src={facilityLogo}
              alt={facilityName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center">
              <div className="flex gap-[2px] -translate-y-[1px]">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {facilityName}
            </p>
            {displayName && (
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-[200px]">
                {displayName}
              </p>
            )}
          </div>
        </div>

        {roleLabel && (
          <span className="px-3 py-1 rounded-full bg-black dark:bg-stone-600 text-xs text-white font-semibold">
            {roleLabel}
          </span>
        )}
      </div>
    </header>
  );
};

const NavButton = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={
      "flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors " +
      (active ? "text-amber-600 dark:text-amber-400" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300")
    }
  >
    <div className="w-6 h-6 flex items-center justify-center relative">
      {icon}
      {badge && (
        <div className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
          {badge}
        </div>
      )}
    </div>
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

// Icon-Map für dynamisches Rendering
const TAB_ICONS = {
  news: Home,
  group: Users,
  food: UtensilsCrossed,
  absence: CalendarDays,
  calendar: CalendarIcon,
  chat: MessageCircle,
  profile: UserIcon,
  admin: SettingsIcon,
};

const AppFooter = ({ activeTab, setActiveTab, user, badges, tabPrefs, onOpenMore }) => {
  const role = user?.role || "parent";
  const defaults = DEFAULT_TABS[role] || DEFAULT_TABS.parent;

  // Verwende gespeicherte oder default Tabs
  const mainTabs = tabPrefs?.main?.length > 0 ? tabPrefs.main : defaults.main;
  const moreTabs = tabPrefs?.more?.length > 0 ? tabPrefs.more : defaults.more;

  // Prüfen ob im More-Menü ein Tab mit Badge ist
  const hasMoreBadge = moreTabs.some((tabId) => badges[tabId]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 transition-colors">
      <div className="max-w-4xl mx-auto px-2">
        <div className="flex justify-between">
          {/* Dynamische Haupt-Tabs */}
          {mainTabs.map((tabId) => {
            const Icon = TAB_ICONS[tabId];
            if (!Icon) return null;

            // Prüfen ob Tab für Rolle verfügbar
            if (tabId === "chat" && role !== "parent") return null;
            if (tabId === "admin" && role !== "admin") return null;
            if (tabId === "calendar" && role === "admin") return null;

            return (
              <NavButton
                key={tabId}
                icon={<Icon size={20} />}
                label={ALL_TABS[tabId]?.label || tabId}
                active={activeTab === tabId}
                onClick={() => setActiveTab(tabId)}
                badge={badges[tabId]}
              />
            );
          })}

          {/* Mehr-Button */}
          <NavButton
            icon={<Menu size={20} />}
            label="Mehr"
            active={false}
            onClick={onOpenMore}
            badge={hasMoreBadge ? <span className="w-2 h-2 rounded-full bg-amber-500" /> : null}
          />
        </div>
      </div>
    </footer>
  );
};

// --------------------------------------------------
// Haupt-App
// --------------------------------------------------

// User-Profil aus Supabase laden
async function loadUserProfile(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      primary_group,
      facility_id,
      must_reset_password,
      has_seen_welcome,
      theme_preference,
      children (
        id,
        first_name,
        birthday,
        notes,
        group_id
      )
    `)
    .eq("id", userId)
    .single();

  if (error) throw error;

  // Format für App (Kompatibilität mit bestehendem Code)
  return {
    id: profile.id,
    name: profile.full_name,
    role: profile.role,
    primaryGroup: profile.primary_group,
    facilityId: profile.facility_id,
    mustResetPassword: profile.must_reset_password || false,
    hasSeenWelcome: profile.has_seen_welcome || false,
    themePreference: profile.theme_preference || "light",
    children: (profile.children || []).map(c => ({
      id: c.id,
      name: c.first_name,
      group: c.group_id,
      birthday: c.birthday,
      notes: c.notes,
    })),
  };
}

// Hilfsfunktion: Standard-Tab basierend auf Rolle
function getDefaultTabForRole(role) {
  switch (role) {
    case "parent": return "group";
    case "team": return "absence";
    case "admin": return "admin";
    default: return "news";
  }
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [pendingResetUser, setPendingResetUser] = useState(null);
  const [activeTab, setActiveTab] = useState("news");
  const [loading, setLoading] = useState(true);
  // Unteransicht im Profil-Tab: home | children | notifications | facility | security
  const [profileView, setProfileView] = useState("home");
  // Geburtstags-Badge für Team-User
  const [hasBirthdays, setHasBirthdays] = useState(false);
  // Unbestätigte Antworten-Count für Eltern (Badge in Navigation)
  const [unacknowledgedResponsesCount, setUnacknowledgedResponsesCount] = useState(0);
  // Ungelesene Chat-Nachrichten Count für Eltern (Badge in Navigation)
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  // Ungelesene Likes Count für Team/Admin (Badge in Navigation)
  const [unreadLikesCount, setUnreadLikesCount] = useState(0);
  // Badge-Präferenzen für verschiedene Kategorien
  const [badgePrefs, setBadgePrefs] = useState({});
  // Email-Bestätigung erfolgreich (zeigt Meldung statt Auto-Login)
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  // Email-Änderung erfolgreich bestätigt (zeigt Popup)
  const [emailChangeConfirmed, setEmailChangeConfirmed] = useState(false);
  // Tab-Präferenzen für dynamisches Menü
  const [tabPrefs, setTabPrefs] = useState(null);
  // Mehr-Menü offen/geschlossen
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  // Willkommensscreen anzeigen
  const [showWelcome, setShowWelcome] = useState(false);
  // Ref um zu tracken ob Welcome-Check bereits durchgeführt wurde (verhindert Mehrfach-Anzeige)
  const welcomeCheckDoneRef = useRef(false);
  // Verbindungsstatus für Debug/Anzeige
  const [connectionIssue, setConnectionIssue] = useState(null);
  // Facility context
  const { facility } = useFacility();

  // Session beim Start wiederherstellen via Supabase Auth
  useEffect(() => {
    let mounted = true;
    const supabaseStorageKey = "sb-izpjmvgtrwxjmucebfyy-auth-token";

    // Prüfen ob dies ein Email-Bestätigungs-Redirect ist
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isEmailConfirmation = hashParams.get("type") === "signup" ||
                                 hashParams.get("type") === "email_confirmation";
    const isEmailChange = hashParams.get("type") === "email_change";

    async function initSession() {
      const storedSession = localStorage.getItem(supabaseStorageKey);

      // Bei Email-Bestätigung: Ausloggen und Erfolg anzeigen
      if (isEmailConfirmation) {
        // URL bereinigen
        window.history.replaceState({}, "", window.location.pathname);

        // Kurz warten, dann ausloggen und Meldung zeigen
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // Ignorieren
        }

        if (mounted) {
          setEmailConfirmed(true);
          setLoading(false);
        }
        return;
      }

      // Bei Email-Änderung: User bleibt eingeloggt, aber Popup anzeigen
      if (isEmailChange) {
        // URL bereinigen
        window.history.replaceState({}, "", window.location.pathname);

        if (mounted) {
          setEmailChangeConfirmed(true);
        }
        // Weiter mit normalem Session-Loading (User bleibt eingeloggt)
      }

      try {
        // Timeout für getSession (5 Sekunden)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 5000)
        );

        const result = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        const { data: { session } } = result;

        if (session?.user && mounted) {
          try {
            const userData = await loadUserProfile(session.user.id);

            // Prüfen ob Passwort-Reset erforderlich
            if (userData.mustResetPassword) {
              setPendingResetUser(userData);
            } else {
              setUser(userData);
              // Standard-Tab basierend auf Rolle setzen
              setActiveTab(getDefaultTabForRole(userData.role));
            }
          } catch (profileError) {
            // Bei Profil-Fehler: Session löschen und Login zeigen
            await supabase.auth.signOut();
          }
        }
      } catch (e) {
        // Bei Timeout: Gespeicherte Session löschen und nochmal versuchen
        if (e.message === "getSession timeout" && storedSession) {
          localStorage.removeItem(supabaseStorageKey);

          // Zweiter Versuch ohne gespeicherte Session
          try {
            await supabase.auth.getSession();
          } catch (retryError) {
            // Fehlgeschlagen - zeige Login
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Auth-State-Listener für automatische Updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Bei Email-Bestätigung ignorieren (wird oben behandelt)
        if (isEmailConfirmation) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          setPendingResetUser(null);
          // Welcome-Check zurücksetzen für nächsten Login
          welcomeCheckDoneRef.current = false;
        } else if (event === "PASSWORD_RECOVERY" && session?.user) {
          // User hat Passwort-Reset-Link geklickt → ForceReset anzeigen
          try {
            const userData = await loadUserProfile(session.user.id);
            // Flag auf true setzen, damit ForceReset angezeigt wird
            userData.mustResetPassword = true;
            setPendingResetUser(userData);
            setUser(null);
          } catch (e) {
            console.error("Profil laden fehlgeschlagen", e);
          }
        } else if (event === "SIGNED_IN" && session?.user) {
          try {
            const userData = await loadUserProfile(session.user.id);

            // Prüfen ob Passwort-Reset erforderlich
            if (userData.mustResetPassword) {
              setPendingResetUser(userData);
              setUser(null);
            } else {
              setUser(userData);
              setPendingResetUser(null);
              // Standard-Tab basierend auf Rolle setzen
              setActiveTab(getDefaultTabForRole(userData.role));
            }
          } catch (e) {
            console.error("Profil laden fehlgeschlagen", e);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Event aus Profil („Adminbereich öffnen“)
  useEffect(() => {
    const handler = () => setActiveTab("admin");
    window.addEventListener("openAdminViaSettings", handler);
    return () => window.removeEventListener("openAdminViaSettings", handler);
  }, []);

  // Profil-Unterseite zurücksetzen, wenn man Tab wechselt
  useEffect(() => {
    if (activeTab !== "profile" && profileView !== "home") {
      setProfileView("home");
    }
  }, [activeTab, profileView]);

  // Geburtstage laden für Team-User (Badge in Navigation)
  useEffect(() => {
    if (!user || user.role !== "team") {
      setHasBirthdays(false);
      return;
    }

    async function checkBirthdays() {
      try {
        const hasBdays = await hasTodayBirthdaysForUser(user);
        setHasBirthdays(hasBdays);
      } catch (err) {
        console.error("Geburtstags-Check fehlgeschlagen:", err);
        setHasBirthdays(false);
      }
    }

    checkBirthdays();
  }, [user]);

  // Connection Monitor starten wenn User eingeloggt ist
  // WICHTIG: Nur einmal starten, nicht bei jedem User-State-Change
  useEffect(() => {
    // Nur starten wenn User existiert, und nur einmal
    if (!user?.id) return;

    // Callback für Verbindungsstatus-Änderungen
    setStatusChangeCallback((event) => {
      console.log("[App] Connection Event:", event);

      // Bei kritischen Problemen Banner anzeigen
      if (event.type === "network" && event.status === "offline") {
        setConnectionIssue("Keine Internetverbindung");
      } else if (event.type === "network" && event.status === "online") {
        setConnectionIssue(null);
      } else if (event.type === "session" && event.status === "expired") {
        setConnectionIssue("Sitzung abgelaufen - bitte neu anmelden");
      } else if (event.type === "realtime" && event.status === "CHANNEL_ERROR") {
        setConnectionIssue("Verbindungsproblem - wird wiederhergestellt...");
      } else if (event.type === "realtime" && event.status === "CLOSED") {
        setConnectionIssue("Verbindung unterbrochen - Wiederverbindung läuft...");
      } else if (event.type === "connection_lost" && event.status === "recovering") {
        setConnectionIssue(`Verbindung verloren - Versuch ${event.attempt}/3...`);
      } else if (event.type === "connection_lost" && event.status === "failed") {
        setConnectionIssue(event.message || "Verbindung verloren. Bitte Seite neu laden.");
      } else if (event.type === "connection_lost" && event.status === "recovered") {
        setConnectionIssue(null);
      } else if (event.type === "reconnect" && event.status === "success") {
        setConnectionIssue(null);
      }
    });

    // Monitor starten
    startConnectionMonitor();

    // Cleanup nur bei echtem Unmount (Logout), nicht bei Re-Renders
    return () => {
      // Nicht stoppen bei Re-Render, nur bei echtem Logout
      // Der Monitor prüft selbst ob er bereits läuft
    };
  }, [user?.id]); // Nur user.id als Dependency, nicht das ganze user Objekt

  // Unbestätigte Antworten für Eltern prüfen (Badge in Navigation)
  useEffect(() => {
    if (!user || user.role !== "parent") {
      setUnacknowledgedResponsesCount(0);
      return;
    }

    async function checkUnacknowledgedResponses() {
      try {
        // Alle Kinder-IDs des Elternteils
        const childIds = (user.children || []).map(c => c.id);
        if (childIds.length === 0) {
          setUnacknowledgedResponsesCount(0);
          return;
        }

        // Anzahl unbestätigter Antworten zählen
        const { count, error } = await supabase
          .from("absences")
          .select("id", { count: "exact", head: true })
          .in("child_id", childIds)
          .not("staff_response", "is", null)
          .eq("response_acknowledged", false);

        if (error) throw error;

        setUnacknowledgedResponsesCount(count || 0);
      } catch (err) {
        console.error("Unbestätigte Antworten Check fehlgeschlagen:", err);
        setUnacknowledgedResponsesCount(0);
      }
    }

    checkUnacknowledgedResponses();

    // Custom Event Listener für manuelle Aktualisierung (z.B. nach Bestätigung)
    const handleRefresh = () => checkUnacknowledgedResponses();
    window.addEventListener("refreshAbsenceBadge", handleRefresh);

    // Realtime-Subscription für Änderungen
    const channel = supabase
      .channel("absence-responses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "absences",
        },
        () => {
          checkUnacknowledgedResponses();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("refreshAbsenceBadge", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Ungelesene Chat-Nachrichten für Eltern prüfen (Badge in Navigation)
  useEffect(() => {
    if (!user || user.role !== "parent") {
      setUnreadChatCount(0);
      return;
    }

    async function checkUnreadChat() {
      try {
        // Alle aktiven Chat-Teilnahmen des Users laden
        const { data: participations, error: partError } = await supabase
          .from("group_chat_participants")
          .select("group_id, last_read_at, activated_at")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (partError) throw partError;

        if (!participations || participations.length === 0) {
          setUnreadChatCount(0);
          return;
        }

        // Für jede Teilnahme ungelesene Nachrichten zählen
        let totalUnread = 0;
        for (const part of participations) {
          const { count, error } = await supabase
            .from("group_chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("group_id", part.group_id)
            .neq("user_id", user.id) // Eigene Nachrichten nicht zählen
            .gt("created_at", part.last_read_at || part.activated_at);

          if (!error && count > 0) {
            totalUnread += count;
          }
        }

        setUnreadChatCount(totalUnread);
      } catch (err) {
        console.error("Ungelesene Chat-Nachrichten Check fehlgeschlagen:", err);
        setUnreadChatCount(0);
      }
    }

    checkUnreadChat();

    // Custom Event Listener für manuelle Aktualisierung
    const handleRefresh = () => checkUnreadChat();
    window.addEventListener("refreshChatBadge", handleRefresh);

    // Realtime-Subscription für neue Chat-Nachrichten
    const channel = supabase
      .channel("chat-messages-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
        },
        () => {
          checkUnreadChat();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("refreshChatBadge", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Ungelesene Likes für Team/Admin prüfen (Badge in Navigation)
  useEffect(() => {
    if (!user || (user.role !== "team" && user.role !== "admin")) {
      setUnreadLikesCount(0);
      return;
    }

    async function checkUnreadLikes() {
      try {
        // Zuerst last_seen_news_likes aus Profil laden
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("last_seen_news_likes")
          .eq("id", user.id)
          .single();

        if (profileError) {
          // Spalte existiert evtl. noch nicht - graceful degradation
          setUnreadLikesCount(0);
          return;
        }

        const lastSeen = profile?.last_seen_news_likes;

        // Alle Likes zählen die nach lastSeen erstellt wurden
        // Falls lastSeen null ist, zeige nichts an (erste Nutzung)
        if (!lastSeen) {
          setUnreadLikesCount(0);
          return;
        }

        // Anzahl neuer Likes seit lastSeen
        const { count, error: countError } = await supabase
          .from("news_likes")
          .select("id", { count: "exact", head: true })
          .gt("created_at", lastSeen);

        if (countError) throw countError;

        setUnreadLikesCount(count || 0);
      } catch (err) {
        console.error("Ungelesene Likes Check fehlgeschlagen:", err);
        setUnreadLikesCount(0);
      }
    }

    checkUnreadLikes();

    // Custom Event Listener für manuelle Aktualisierung
    const handleRefresh = () => checkUnreadLikes();
    window.addEventListener("refreshNewsBadge", handleRefresh);

    // Realtime-Subscription für neue Likes
    const channel = supabase
      .channel("news-likes-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news_likes",
        },
        () => {
          checkUnreadLikes();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("refreshNewsBadge", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Badge-Präferenzen laden (badge_enabled pro Kategorie)
  useEffect(() => {
    if (!user) {
      setBadgePrefs({});
      return;
    }

    async function loadBadgePrefs() {
      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("category, badge_enabled")
          .eq("user_id", user.id);

        if (error) throw error;

        // Zu einem Object konvertieren: { news: true, chat: false, ... }
        const prefsObj = {};
        (data || []).forEach(p => {
          // badge_enabled ist standardmäßig true wenn nicht gesetzt
          prefsObj[p.category] = p.badge_enabled !== false;
        });
        setBadgePrefs(prefsObj);
      } catch (err) {
        console.error("Badge-Präferenzen laden fehlgeschlagen:", err);
        setBadgePrefs({});
      }
    }

    loadBadgePrefs();

    // Event Listener für Änderungen aus ProfileNotifications
    const handlePrefsChanged = () => loadBadgePrefs();
    window.addEventListener("notificationPreferencesChanged", handlePrefsChanged);

    return () => {
      window.removeEventListener("notificationPreferencesChanged", handlePrefsChanged);
    };
  }, [user]);

  // Tab-Präferenzen laden
  useEffect(() => {
    if (!user) {
      setTabPrefs(null);
      return;
    }

    async function loadTabPrefs() {
      try {
        const { data, error } = await supabase
          .from("user_tab_preferences")
          .select("main_tabs, more_tabs")
          .eq("user_id", user.id)
          .maybeSingle(); // maybeSingle statt single - gibt null zurück wenn kein Datensatz

        if (data && !error) {
          setTabPrefs({
            main: data.main_tabs || [],
            more: data.more_tabs || [],
          });
        } else {
          // Keine gespeicherten Präferenzen - defaults werden verwendet
          setTabPrefs(null);
        }
      } catch (err) {
        // Ignorieren - defaults werden verwendet
        setTabPrefs(null);
      }
    }

    loadTabPrefs();

    // Event Listener für Änderungen aus dem MoreMenu
    const handlePrefsChanged = () => loadTabPrefs();
    window.addEventListener("tabPreferencesChanged", handlePrefsChanged);

    return () => {
      window.removeEventListener("tabPreferencesChanged", handlePrefsChanged);
    };
  }, [user]);

  // Willkommensscreen anzeigen, wenn User neu ist (nur einmal pro Session prüfen)
  useEffect(() => {
    // Nur prüfen wenn User existiert
    if (!user) return;

    // Warten bis hasSeenWelcome einen definierten Wert hat (nicht undefined)
    if (typeof user.hasSeenWelcome !== "boolean") return;

    // Check nur einmal durchführen
    if (welcomeCheckDoneRef.current) return;

    // Jetzt markieren dass Check durchgeführt wurde
    welcomeCheckDoneRef.current = true;

    // Anzeigen wenn hasSeenWelcome false ist
    if (user.hasSeenWelcome === false) {
      // Direkt anzeigen (ohne Timeout, da User bereits vollständig geladen)
      setShowWelcome(true);
    }
    // Kein cleanup nötig - ref verhindert erneute Ausführung
  }, [user]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    // User-Objekt aktualisieren
    setUser((prev) => ({ ...prev, hasSeenWelcome: true }));
  };

  const handleLogin = async (loggedInUser) => {
    // Session wird von Supabase Auth gemanaged
    // Hier nur State setzen für sofortige UI-Reaktion
    if (loggedInUser.mustResetPassword) {
      setPendingResetUser(loggedInUser);
      setUser(null);
    } else {
      setUser(loggedInUser);
      setPendingResetUser(null);
      // Standard-Tab basierend auf Rolle setzen
      setActiveTab(getDefaultTabForRole(loggedInUser.role));

      // Push Notifications registrieren (async, non-blocking)
      registerPushNotifications(loggedInUser.id).catch(console.error);
      setupPushListeners((notification) => {
        // Optional: Toast oder Badge bei eingehender Notification
        console.log('Notification received:', notification);
      });
    }
    // Email-Bestätigung zurücksetzen falls gesetzt
    setEmailConfirmed(false);
  };

  const handleLogout = async () => {
    try {
      // Push Token entfernen
      if (user?.id) {
        await removePushToken(user.id);
        await cleanupPushListeners();
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout failed", e);
    }
    setUser(null);
    setPendingResetUser(null);
    // Welcome-Check zurücksetzen für nächsten Login
    welcomeCheckDoneRef.current = false;
  };

  const handlePasswordUpdated = (updatedUser) => {
    setPendingResetUser(null);
    setUser(updatedUser);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // Konto löschen: User aus Supabase löschen und abmelden
  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Kinder löschen
      await supabase.from("children").delete().eq("user_id", user.id);
      // Profil löschen
      await supabase.from("profiles").delete().eq("id", user.id);
      // Auth-User kann nur von Supabase Admin API gelöscht werden
      // Für Self-Delete: Logout genügt, Auth-User bleibt (kann später Admin löschen)
      await handleLogout();
    } catch (e) {
      console.error("Account löschen fehlgeschlagen", e);
    }
  };

  // ------------------------------------------
  // Auth-Flows
  // ------------------------------------------

  // Loading-State während Session geladen wird
  if (loading) {
    return (
      <div className="h-screen bg-[#fcfaf7] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

  if (!user && pendingResetUser) {
    return (
      <ForceReset
        user={pendingResetUser}
        onPasswordUpdated={handlePasswordUpdated}
      />
    );
  }

  // Email-Bestätigung erfolgreich - Login-Aufforderung anzeigen
  if (emailConfirmed && !user) {
    return (
      <div className="h-screen bg-[#fcfaf7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            {facility.logo_url ? (
              <img
                src={facility.logo_url}
                alt={facility.display_name}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-4 shadow-lg"
              />
            ) : (
              <div className="bg-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sprout className="text-white" size={32} />
              </div>
            )}
            <h1 className="text-2xl font-bold text-stone-800">
              {facility.display_name}
            </h1>
          </div>

          {/* Erfolgs-Card */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 text-center space-y-4">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800">
              E-Mail bestätigt!
            </h2>
            <p className="text-stone-600">
              Deine E-Mail-Adresse wurde erfolgreich bestätigt.
              Du kannst dich jetzt anmelden.
            </p>
            <button
              onClick={() => setEmailConfirmed(false)}
              className="w-full bg-stone-800 text-white font-bold py-4 rounded-xl hover:bg-stone-900 mt-4 shadow-md"
            >
              Zum Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !pendingResetUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const isAdmin = user.role === "admin";

  // ------------------------------------------
  // Inhalt für Profil-Tab
  // ------------------------------------------

  const renderProfileContent = () => {
    switch (profileView) {
      case "children":
        return (
          <ProfileChildren
            user={user}
            isTeam={user.role === "team"}
            onBack={() => setProfileView("home")}
            onUpdateUser={handleUserUpdate}
          />
        );
      case "children-records":
        return (
          <AdminChildrenRecords
            user={user}
            readOnly={user.role === "team"}
            onBack={() => setProfileView("home")}
          />
        );
      case "notifications":
        return (
          <ProfileNotifications
            user={user}
            onBack={() => setProfileView("home")}
          />
        );
      case "facility":
        return (
          <ProfileFacility
            user={user}
            onBack={() => setProfileView("home")}
          />
        );
      case "security":
        return (
          <ProfileSecurity
            user={user}
            onBack={() => setProfileView("home")}
            onUpdateUser={handleUserUpdate}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      case "customize":
        return (
          <ProfileCustomize
            user={user}
            onBack={() => setProfileView("home")}
            onShowWelcome={() => {
              setProfileView("home");
              setShowWelcome(true);
            }}
          />
        );
      default:
        return (
          <ProfileHome
            user={user}
            onNavigate={setProfileView}
            onLogout={handleLogout}
          />
        );
    }
  };

  // ------------------------------------------
  // Haupt-Inhalt per Tab
  // ------------------------------------------

  let mainContent = null;

  if (activeTab === "news") {
    mainContent = <News user={user} />;
  } else if (activeTab === "group") {
    mainContent = <GroupArea user={user} />;
  } else if (activeTab === "food") {
    // Team- und Admin-Nutzer dürfen den Speiseplan bearbeiten.
    mainContent = (
      <FoodPlan
        isAdmin={user.role === "admin" || user.role === "team"}
      />
    );
  } else if (activeTab === "absence") {
    if (user.role === "team") {
      mainContent = <AbsenceTeamWrapper user={user} />;
    } else if (user.role === "admin") {
      mainContent = <AdminAbsenceDashboard user={user} />;
    } else {
      mainContent = <AbsenceReport user={user} />;
    }
  } else if (activeTab === "calendar") {
    // Kalender/Terminübersicht für Eltern und Team
    mainContent = <CalendarView />;
  } else if (activeTab === "chat" && user.role === "parent") {
    // Gruppenchat nur für Eltern
    mainContent = <GroupChat user={user} />;
  } else if (activeTab === "profile") {
    mainContent = renderProfileContent();
  } else if (activeTab === "admin" && isAdmin) {
    mainContent = <AdminArea user={user} />;
  } else {
    mainContent = (
      <div className="p-4 text-sm text-stone-500">Unbekannter Tab.</div>
    );
  }

  // ------------------------------------------
  // Layout: Header – Content – Footer
  // ------------------------------------------

  return (
    <ThemeProvider userId={user?.id}>
      <GroupsProvider>
        <div className="min-h-screen flex flex-col bg-[#fcfaf7] dark:bg-stone-900 transition-colors">
          <AppHeader user={user} facilityName={facility.display_name} facilityLogo={facility.logo_url} />

          {/* Verbindungsproblem-Banner */}
          {connectionIssue && (
            <div className={`fixed top-14 left-0 right-0 z-50 text-white text-center py-2 px-4 text-sm font-medium shadow-lg ${
              connectionIssue.includes("neu laden") ? "bg-red-500" : "bg-amber-500"
            }`}>
              {connectionIssue}
              {connectionIssue.includes("neu laden") ? (
                <button
                  onClick={() => window.location.reload()}
                  className="ml-3 bg-white text-red-600 px-3 py-1 rounded font-bold"
                >
                  Jetzt neu laden
                </button>
              ) : (
                <button
                  onClick={() => {
                    testConnection().then((result) => {
                      if (result.database?.ok) {
                        setConnectionIssue(null);
                      }
                    });
                  }}
                  className="ml-3 underline"
                >
                  Prüfen
                </button>
              )}
            </div>
          )}

          <main className="flex-1 overflow-y-auto pt-20 pb-20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <ErrorBoundary>{mainContent}</ErrorBoundary>
          </div>
        </main>

        <AppFooter
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          badges={{
            // Badges nur anzeigen wenn badge_enabled nicht explizit false ist
            news: (badgePrefs.news !== false) && unreadLikesCount > 0
              ? (unreadLikesCount > 9 ? "9+" : unreadLikesCount)
              : null,
            group: (badgePrefs.birthdays !== false) && hasBirthdays
              ? <Cake size={10} />
              : null,
            absence: (badgePrefs.absence_response !== false) && unacknowledgedResponsesCount > 0
              ? "!"
              : null,
            chat: (badgePrefs.chat !== false) && unreadChatCount > 0
              ? "!"
              : null,
          }}
          tabPrefs={tabPrefs}
          onOpenMore={() => setMoreMenuOpen(true)}
        />

        {/* Mehr-Menü (Slide-out) */}
        <MoreMenu
          isOpen={moreMenuOpen}
          onClose={() => setMoreMenuOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          badges={{
            news: (badgePrefs.news !== false) && unreadLikesCount > 0
              ? (unreadLikesCount > 9 ? "9+" : unreadLikesCount)
              : null,
            group: (badgePrefs.birthdays !== false) && hasBirthdays
              ? <Cake size={10} />
              : null,
            absence: (badgePrefs.absence_response !== false) && unacknowledgedResponsesCount > 0
              ? "!"
              : null,
            chat: (badgePrefs.chat !== false) && unreadChatCount > 0
              ? "!"
              : null,
          }}
        />

        <InstallPrompt />
        <UpdatePrompt />

        {/* Willkommensscreen für neue User */}
        {showWelcome && (
          <WelcomeScreen user={user} onComplete={handleWelcomeComplete} />
        )}

        {/* Email-Änderung erfolgreich Popup */}
        {emailChangeConfirmed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="relative bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
              <button
                onClick={() => setEmailChangeConfirmed(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X size={20} />
              </button>

              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Mail className="text-green-600 dark:text-green-400" size={32} />
              </div>

              <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">
                E-Mail geändert!
              </h2>

              <p className="text-stone-600 dark:text-stone-400">
                Deine E-Mail-Adresse wurde erfolgreich geändert. Ab sofort meldest du dich mit der neuen Adresse an.
              </p>

              <button
                onClick={() => setEmailChangeConfirmed(false)}
                className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition-colors"
              >
                Verstanden
              </button>
            </div>
          </div>
        )}
        </div>
      </GroupsProvider>
    </ThemeProvider>
  );
}

// Wrapper mit FacilityProvider
export default function App() {
  return (
    <FacilityProvider>
      <AppContent />
    </FacilityProvider>
  );
}