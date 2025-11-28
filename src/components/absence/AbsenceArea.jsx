// src/components/absence/AbsenceArea.jsx

import React from "react";

// Eltern-Ansicht
import AbsenceReport from "./AbsenceReport";

// Team-Ansicht (Wrapper, da die Team-View aus mehreren Komponenten besteht)
import AbsenceTeamWrapper from "./AbsenceTeamWrapper";

// Admin-Ansicht
import AdminAbsenceDashboard from "./AdminAbsenceDashboard";

export default function AbsenceArea({ user }) {
  const role = user?.role;

  if (!role) return null;

  // ---------------------------
  // ADMIN → komplette Übersicht
  // ---------------------------
  if (role === "admin") {
    return <AdminAbsenceDashboard user={user} />;
  }

  // ---------------------------
  // TEAM → Wrapper inkl. Tools
  // ---------------------------
  if (role === "team") {
    return <AbsenceTeamWrapper user={user} />;
  }

  // ---------------------------
  // ELTERN → Meldungen definieren
  // ---------------------------
  return <AbsenceReport user={user} />;
}