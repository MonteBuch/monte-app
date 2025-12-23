// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  Home,
  Users,
  UtensilsCrossed,
  CalendarDays,
  User as UserIcon,
  Settings as SettingsIcon,
  Loader2,
  Cake,
  CheckCircle,
  Sprout,
  MessageCircle,
} from "lucide-react";

import { supabase } from "./api/supabaseClient";
import { GroupsProvider } from "./context/GroupsContext";
import { FacilityProvider, useFacility } from "./context/FacilityContext";
import {
  registerPushNotifications,
  removePushToken,
  setupPushListeners,
  cleanupPushListeners,
} from "./lib/pushNotifications";

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

import AdminArea from "./components/admin/AdminArea";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallPrompt from "./components/ui/InstallPrompt";
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
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-stone-200">
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
            <p className="text-sm font-bold text-stone-900">
              {facilityName}
            </p>
            {displayName && (
              <p className="text-xs text-stone-500 truncate max-w-[200px]">
                {displayName}
              </p>
            )}
          </div>
        </div>

        {roleLabel && (
          <span className="px-3 py-1 rounded-full bg-black text-xs text-white font-semibold">
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
      (active ? "text-amber-600" : "text-stone-500 hover:text-stone-700")
    }
  >
    <div className="w-6 h-6 flex items-center justify-center relative">
      {icon}
      {badge && (
        <div className="absolute -top-1 -right-3 bg-amber-500 text-white rounded-full p-0.5">
          {badge}
        </div>
      )}
    </div>
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const AppFooter = ({ activeTab, setActiveTab, isAdmin, hasBirthdays, hasUnacknowledgedResponses }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200">
      <div className="max-w-4xl mx-auto px-2">
        <div className="flex justify-between">
          <NavButton
            icon={<Home size={20} />}
            label="News"
            active={activeTab === "news"}
            onClick={() => setActiveTab("news")}
          />
          <NavButton
            icon={<Users size={20} />}
            label="Gruppe"
            active={activeTab === "group"}
            onClick={() => setActiveTab("group")}
            badge={hasBirthdays ? <Cake size={10} /> : null}
          />
          <NavButton
            icon={<UtensilsCrossed size={20} />}
            label="Essen"
            active={activeTab === "food"}
            onClick={() => setActiveTab("food")}
          />
          <NavButton
            icon={<CalendarDays size={20} />}
            label="Meldungen"
            active={activeTab === "absence"}
            onClick={() => setActiveTab("absence")}
            badge={hasUnacknowledgedResponses ? <MessageCircle size={10} /> : null}
          />
          <NavButton
            icon={<UserIcon size={20} />}
            label="Profil"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          {isAdmin && (
            <NavButton
              icon={<SettingsIcon size={20} />}
              label="Admin"
              active={activeTab === "admin"}
              onClick={() => setActiveTab("admin")}
            />
          )}
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
  // Unbestätigte Antworten-Badge für Eltern
  const [hasUnacknowledgedResponses, setHasUnacknowledgedResponses] = useState(false);
  // Email-Bestätigung erfolgreich (zeigt Meldung statt Auto-Login)
  const [emailConfirmed, setEmailConfirmed] = useState(false);
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

  // Unbestätigte Antworten für Eltern prüfen (Badge in Navigation)
  useEffect(() => {
    if (!user || user.role !== "parent") {
      setHasUnacknowledgedResponses(false);
      return;
    }

    async function checkUnacknowledgedResponses() {
      try {
        // Alle Kinder-IDs des Elternteils
        const childIds = (user.children || []).map(c => c.id);
        if (childIds.length === 0) {
          setHasUnacknowledgedResponses(false);
          return;
        }

        // Prüfen ob es unbestätigte Antworten gibt
        const { count, error } = await supabase
          .from("absences")
          .select("id", { count: "exact", head: true })
          .in("child_id", childIds)
          .not("staff_response", "is", null)
          .eq("response_acknowledged", false);

        if (error) throw error;

        setHasUnacknowledgedResponses(count > 0);
      } catch (err) {
        console.error("Unbestätigte Antworten Check fehlgeschlagen:", err);
        setHasUnacknowledgedResponses(false);
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
              Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
              Sie können sich jetzt anmelden.
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
    <GroupsProvider>
      <div className="min-h-screen flex flex-col bg-[#fcfaf7]">
        <AppHeader user={user} facilityName={facility.display_name} facilityLogo={facility.logo_url} />

        <main className="flex-1 overflow-y-auto pt-20 pb-20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <ErrorBoundary>{mainContent}</ErrorBoundary>
          </div>
        </main>

        <AppFooter
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          hasBirthdays={hasBirthdays}
          hasUnacknowledgedResponses={hasUnacknowledgedResponses}
        />

        <InstallPrompt />
      </div>
    </GroupsProvider>
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