// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  Home,
  Users,
  UtensilsCrossed,
  CalendarDays,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";

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
// ProfileSecurity könntest du später noch anbinden
// import ProfileSecurity from "./components/profile/ProfileSecurity";

import AdminArea from "./components/admin/AdminArea";
import ErrorBoundary from "./components/ErrorBoundary";

// --------------------------------------------------
// Hilfs-Komponenten: Header & Footer
// --------------------------------------------------

const AppHeader = ({ user }) => {
  if (!user) return null;

  const displayName = user.name || user.username || "";
  let roleLabel = null;

  if (user.role === "team") roleLabel = "Team";
  if (user.role === "admin") roleLabel = "Leitung";

  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* kleines „Montessori“-Logo: 4 stilisierte Figuren */}
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center">
            <div className="flex gap-[2px] -translate-y-[1px]">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-stone-900">
              Montessori Kinderhaus
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

const NavButton = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={
      "flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors " +
      (active ? "text-amber-600" : "text-stone-500 hover:text-stone-700")
    }
  >
    <div className="w-6 h-6 flex items-center justify-center">
      {icon}
    </div>
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const AppFooter = ({ activeTab, setActiveTab, isAdmin }) => {
  return (
    <footer className="bg-white border-t border-stone-200">
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

const SESSION_KEY = "montessori_session";

export default function App() {
  const [user, setUser] = useState(null);
  const [pendingResetUser, setPendingResetUser] = useState(null);
  const [activeTab, setActiveTab] = useState("news");

  // Unteransicht im Profil-Tab: home | children | notifications | facility
  const [profileView, setProfileView] = useState("home");

  // Session beim Start wiederherstellen
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.mustResetPassword) {
          setPendingResetUser(parsed);
        } else {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error("Session restore failed", e);
    }
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

  const handleLogin = (loggedInUser) => {
    if (loggedInUser.mustResetPassword) {
      setPendingResetUser(loggedInUser);
      setUser(null);
    } else {
      setUser(loggedInUser);
      setPendingResetUser(null);
    }
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
    } catch (e) {
      console.error("Session save failed", e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPendingResetUser(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error("Session clear failed", e);
    }
  };

  const handlePasswordUpdated = (updatedUser) => {
    setPendingResetUser(null);
    setUser(updatedUser);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    } catch (e) {
      console.error("Session save failed", e);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    // Änderung von Kindern / Stammgruppe / Benachrichtigungen etc.
    setUser(updatedUser);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    } catch (e) {
      console.error("Session save failed", e);
    }
  };

  // ------------------------------------------
  // Auth-Flows
  // ------------------------------------------

  if (!user && pendingResetUser) {
    return (
      <ForceReset
        user={pendingResetUser}
        onPasswordUpdated={handlePasswordUpdated}
      />
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
            onBack={() => setProfileView("home")}
            onUserUpdate={handleUserUpdate}
          />
        );
      case "notifications":
        return (
          <ProfileNotifications
            user={user}
            onBack={() => setProfileView("home")}
            onUserUpdate={handleUserUpdate}
          />
        );
      case "facility":
        return (
          <ProfileFacility
            onBack={() => setProfileView("home")}
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
    // FoodPlan entscheidet intern anhand der Rolle, was möglich ist
    mainContent = <FoodPlan user={user} />;
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
    mainContent = <div className="p-4 text-sm text-stone-500">Unbekannter Tab.</div>;
  }

  // ------------------------------------------
  // Layout: Header – Content – Footer
  // ------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfaf7]">
      <AppHeader user={user} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ErrorBoundary>{mainContent}</ErrorBoundary>
        </div>
      </main>

      <AppFooter
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
      />
    </div>
  );
}