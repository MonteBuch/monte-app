// src/components/settings/Settings.jsx
import React, { useState } from "react";
import { LogOut } from "lucide-react";

import ProfileHome from "../profile/ProfileHome";
import ProfileChildren from "../profile/ProfileChildren";
import ProfileSecurity from "../profile/ProfileSecurity";
import ProfileNotifications from "../profile/ProfileNotifications";
import ProfileFacility from "../profile/ProfileFacility"; // ✔ richtige Datei
import ProfileDeleteConfirm from "../profile/ProfileDeleteConfirm";

import AdminArea from "../admin/AdminArea";

export default function Settings({
  user,
  isTeam,
  isAdmin,
  onLogout,
  onUpdateUser,
}) {
  const [screen, setScreen] = useState("home");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const navigate = (target) => {
    setScreen(target);
  };

  const goBack = () => {
    setScreen("home");
  };

  const renderScreen = () => {
    switch (screen) {
      case "home":
        return (
          <ProfileHome
            user={user}
            onNavigate={navigate}
          />
        );

      case "children":
        return (
          <ProfileChildren
            user={user}
            isTeam={isTeam}
            onBack={goBack}
            onUpdateUser={onUpdateUser}
          />
        );

      case "notifications":
        return (
          <ProfileNotifications
            user={user}
            onBack={goBack}
          />
        );

      case "security":
        return (
          <ProfileSecurity
            user={user}
            onBack={goBack}
            onUpdateUser={onUpdateUser}
            onDeleteAccount={() => setConfirmDelete(true)}
          />
        );

      case "facility":
        // ✔ ersetzt FacilityInfo durch ProfileFacility
        return (
          <ProfileFacility
            user={user}
            onBack={goBack}
          />
        );

      case "admin":
        return (
          <AdminArea
            user={user}
            onBack={goBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderScreen()}

      {/* Logout nur auf Home anzeigen */}
      {screen === "home" && (
        <button
          onClick={onLogout}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 shadow"
        >
          <LogOut size={18} />
          Abmelden
        </button>
      )}

      {/* Lösch-Modal */}
      {confirmDelete && (
        <ProfileDeleteConfirm
          user={user}
          onCancel={() => setConfirmDelete(false)}
          onDelete={() => {
            setConfirmDelete(false);
            onLogout();
          }}
        />
      )}
    </div>
  );
}