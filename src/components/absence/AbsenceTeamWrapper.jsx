// src/components/absence/AbsenceTeamWrapper.jsx
import React from "react";
import AbsenceTeam from "./AbsenceTeam";

export default function AbsenceTeamWrapper({ user }) {
  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold text-stone-800">Abwesenheiten</h1>

      {/* Kein "Team" / "Admin" Badge im Header (wie gewünscht entfernt) */}
      <AbsenceTeam user={user} />
    </div>
  );
}