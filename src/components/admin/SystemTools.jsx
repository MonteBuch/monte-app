// src/components/admin/SystemTools.jsx
import React, { useState } from "react";
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  Database,
} from "lucide-react";

import { StorageService } from "../../lib/storage";

export default function SystemTools({ onBack }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmUserWipe, setConfirmUserWipe] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  /* -------------------------------------------------------------
      DATEN EXPORTIEREN
    ------------------------------------------------------------- */
  const exportData = () => {
    const users = StorageService.get("users") || [];
    const facility = StorageService.getFacilitySettings() || {};
    const data = {
      users,
      facility,
      timestamp: new Date().toISOString(),
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
  };

  /* -------------------------------------------------------------
      DATEN IMPORTIEREN
    ------------------------------------------------------------- */
  const importData = (file) => {
    setImportError("");
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);

        if (!json.users || !json.facility) {
          throw new Error("Ungültige Datei. Es fehlen Schlüssel.");
        }

        StorageService.set("users", json.users);
        StorageService.setFacilitySettings(json.facility);

        setImportSuccess(true);
      } catch (err) {
        setImportError(err.message);
      }
    };

    reader.readAsText(file);
  };

  /* -------------------------------------------------------------
      STORAGE RESET (Facility + Users löschen)
    ------------------------------------------------------------- */
  const resetAll = () => {
    StorageService.set("users", []);
    StorageService.setFacilitySettings({});
    sessionStorage.clear();
    localStorage.clear();
    setConfirmReset(false);
    alert("Alle App-Daten wurden vollständig zurückgesetzt.");
  };

  /* -------------------------------------------------------------
      ALLE BENUTZER LÖSCHEN (aber SYSTEM intakt lassen)
    ------------------------------------------------------------- */
  const wipeUsers = () => {
    const facility = StorageService.getFacilitySettings() || {};
    StorageService.set("users", []);

    // Facility-Einstellungen bleiben erhalten
    StorageService.setFacilitySettings(facility);

    setConfirmUserWipe(false);
    alert("Alle Benutzerkonten wurden gelöscht.");
  };

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 text-sm"
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800">System-Tools</h2>

      <p className="text-sm text-stone-600 leading-snug">
        Werkzeuge zur Verwaltung und Sicherung der App-Daten.
        Ideal für Wartung, Systemwechsel oder Entwicklung.
      </p>

      {/* EXPORT */}
      <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <Download size={22} className="text-amber-600" />
          <div>
            <p className="font-semibold text-stone-800">Daten exportieren</p>
            <p className="text-[12px] text-stone-500">
              Nutzer & Einrichtung als Backup speichern
            </p>
          </div>
        </div>

        <button
          onClick={exportData}
          className="w-full py-2 mt-2 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 active:scale-[0.98]"
        >
          Backup herunterladen
        </button>
      </div>

      {/* IMPORT */}
      <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <Upload size={22} className="text-blue-600" />
          <div>
            <p className="font-semibold text-stone-800">Daten importieren</p>
            <p className="text-[12px] text-stone-500">
              Nur JSON-Backups aus der App verwenden
            </p>
          </div>
        </div>

        <input
          type="file"
          accept="application/json"
          onChange={(e) => importData(e.target.files[0])}
          className="w-full mt-2 text-sm"
        />

        {importError && (
          <p className="text-xs text-red-600 mt-1">{importError}</p>
        )}

        {importSuccess && (
          <p className="text-xs text-green-600 mt-1">
            Daten erfolgreich importiert!
          </p>
        )}
      </div>

      {/* NUR BENUTZER LÖSCHEN */}
      <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <Database size={22} className="text-pink-600" />
          <div>
            <p className="font-semibold text-stone-800">
              Alle Benutzerkonten löschen
            </p>
            <p className="text-[12px] text-stone-500">
              Einrichtungsdaten bleiben erhalten
            </p>
          </div>
        </div>

        <button
          onClick={() => setConfirmUserWipe(true)}
          className="w-full py-2 mt-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 active:scale-[0.98]"
        >
          Benutzer löschen
        </button>
      </div>

      {/* KOMPLETTER RESET */}
      <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <RefreshCw size={22} className="text-red-500" />
          <div>
            <p className="font-semibold text-stone-800">
              App vollständig zurücksetzen
            </p>
            <p className="text-[12px] text-stone-500">
              Entfernt ALLE Benutzer + Einrichtungseinstellungen
            </p>
          </div>
        </div>

        <button
          onClick={() => setConfirmReset(true)}
          className="w-full py-2 mt-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 active:scale-[0.98]"
        >
          Gesamten Speicher löschen
        </button>
      </div>

      {/* CONFIRM: USER WIPE */}
      {confirmUserWipe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 border border-stone-200 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-bold text-sm text-stone-800">
                Benutzerkonten löschen?
              </h3>
            </div>

            <p className="text-sm text-stone-600">
              Möchten Sie wirklich <strong>alle Benutzerkonten</strong> löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmUserWipe(false)}
                className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 text-sm font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={wipeUsers}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM: FULL RESET */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 border border-stone-200 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-bold text-sm text-stone-800">
                Gesamten Speicher löschen?
              </h3>
            </div>

            <p className="text-sm text-stone-600">
              Alle Daten der App werden vollständig entfernt.  
              Dies umfasst:  
              – Benutzerkonten  
              – Einrichtungsinformationen  
              – Alle gespeicherten Einstellungen
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 text-sm font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={resetAll}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold"
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}