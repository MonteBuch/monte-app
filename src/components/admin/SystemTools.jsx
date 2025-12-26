// src/components/admin/SystemTools.jsx
import React, { useState } from "react";
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
  Database,
  Loader2,
} from "lucide-react";

import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";

export default function SystemTools({ onBack }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------------------
      DATEN EXPORTIEREN (aus Supabase)
    ------------------------------------------------------------- */
  const exportData = async () => {
    setLoading(true);
    try {
      // Facility laden
      const { data: facility } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", FACILITY_ID)
        .single();

      // Profile laden
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("facility_id", FACILITY_ID);

      // Kinder laden
      const { data: children } = await supabase
        .from("children")
        .select("*")
        .eq("facility_id", FACILITY_ID);

      // Gruppen laden
      const { data: groups } = await supabase
        .from("groups")
        .select("*")
        .eq("facility_id", FACILITY_ID);

      // News laden
      const { data: news } = await supabase
        .from("news")
        .select("*")
        .eq("facility_id", FACILITY_ID);

      const data = {
        facility,
        profiles,
        children,
        groups,
        news,
        timestamp: new Date().toISOString(),
        version: "supabase-export-v1",
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kita-backup-${new Date()
        .toLocaleDateString("de-DE")
        .replace(/\./g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export fehlgeschlagen:", err);
      alert("Export fehlgeschlagen: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------
      LOKALEN CACHE LÖSCHEN (localStorage)
    ------------------------------------------------------------- */
  const clearLocalCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert("Lokaler Cache wurde gelöscht. Die Seite wird neu geladen.");
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-sm"
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">System-Tools</h2>

      <p className="text-sm text-stone-600 dark:text-stone-300 leading-snug">
        Werkzeuge zur Verwaltung und Sicherung der App-Daten.
        Die Daten werden in Supabase gespeichert.
      </p>

      {/* EXPORT */}
      <div className="bg-white dark:bg-stone-800 p-5 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <Download size={22} className="text-amber-600" />
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">Daten exportieren</p>
            <p className="text-[12px] text-stone-500 dark:text-stone-400">
              Alle Daten als JSON-Backup speichern
            </p>
          </div>
        </div>

        <button
          onClick={exportData}
          disabled={loading}
          className="w-full py-2 mt-2 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Exportiere...
            </>
          ) : (
            "Backup herunterladen"
          )}
        </button>
      </div>

      {/* CACHE LÖSCHEN */}
      <div className="bg-white dark:bg-stone-800 p-5 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <RefreshCw size={22} className="text-blue-600" />
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">Lokalen Cache löschen</p>
            <p className="text-[12px] text-stone-500 dark:text-stone-400">
              Löscht gespeicherte Sessions und Cache-Daten
            </p>
          </div>
        </div>

        <button
          onClick={() => setConfirmReset(true)}
          className="w-full py-2 mt-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 active:scale-[0.98]"
        >
          Cache löschen
        </button>
      </div>

      {/* INFO */}
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-900 rounded-2xl">
        <div className="flex items-start gap-3">
          <Database size={20} className="text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-stone-800 dark:text-stone-100">
              Supabase-Datenbank
            </p>
            <p className="text-[12px] text-stone-600 dark:text-stone-300 mt-1">
              Alle Benutzerdaten werden sicher in Supabase gespeichert.
              Für Datenlöschung oder erweiterte Verwaltung nutze das
              Supabase Dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* CONFIRM: CACHE LÖSCHEN */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl max-w-sm w-full space-y-4 border border-stone-200 dark:border-stone-700 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-blue-600" />
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                Lokalen Cache löschen?
              </h3>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300">
              Der lokale Browser-Cache wird gelöscht. Du wirst abgemeldet
              und musst dich neu anmelden. Deine Daten in Supabase
              bleiben erhalten.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-sm font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={clearLocalCache}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
              >
                Cache löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}