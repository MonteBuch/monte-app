// src/components/admin/AdminArea.jsx
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

import AdminHome from "./AdminHome";
import AdminUsers from "./AdminUsers";
import AdminCodes from "./AdminCodes";
import AdminFacility from "./AdminFacility";
import AdminGroups from "./AdminGroups";

export default function AdminArea({ user, onBack }) {
  const [screen, setScreen] = useState("home");

  const goBack = () => {
    if (screen === "home") {
      if (onBack) onBack();
      return;
    }
    setScreen("home");
  };

  const renderScreen = () => {
    switch (screen) {
      case "home":
        return <AdminHome onNavigate={setScreen} />;

      case "users":
        return <AdminUsers onBack={goBack} />;

      case "codes":
        return <AdminCodes onBack={goBack} />;

      case "facility":
        return <AdminFacility onBack={goBack} />;

      case "groups":
        return <AdminGroups onBack={goBack} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Nur 1x zurück, aus AdminArea gesteuert */}
      {screen !== "home" && (
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-stone-500 text-sm"
        >
          <ArrowLeft size={18} />
          Zurück
        </button>
      )}

      {renderScreen()}
    </div>
  );
}