// src/components/absence/AbsenceBanner.jsx
import React from "react";
import { AlertCircle } from "lucide-react";

export default function AbsenceBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <p className="text-sm leading-snug">
        <strong className="font-semibold">Bitte meldet euer Kind rechtzeitig ab.</strong><br />
        Bei Krankheit am gleichen Tag bis <strong>08:00 Uhr</strong> wegen der Essensplanung,
        bei Urlauben frühzeitig. Einträge können jederzeit korrigiert oder gelöscht werden.
      </p>
    </div>
  );
}