// src/components/Auth/ForceReset.jsx
import React, { useState } from "react";
import { Lock, Save, AlertTriangle } from "lucide-react";
import { StorageService } from "../../lib/storage";

export default function ForceReset({ user, onPasswordUpdated }) {
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!newPw1 || !newPw2) {
      setError("Bitte ein neues Passwort vergeben.");
      return;
    }
    if (newPw1 !== newPw2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    // Benutzerliste laden
    const all = StorageService.get("users") || [];
    const idx = all.findIndex((u) => u.id === user.id);

    if (idx < 0) {
      setError("Benutzer nicht gefunden.");
      return;
    }

    // Update durchführen
    const updated = {
      ...user,
      password: newPw1,
      mustResetPassword: false,
      tempPassword: null,
    };

    all[idx] = updated;
    StorageService.set("users", all);

    onPasswordUpdated(updated);
  };

  return (
    <div className="h-screen bg-[#fcfaf7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-stone-200">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-amber-500 p-3 rounded-full text-white shadow">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mt-3">
            Passwort zurücksetzen
          </h2>
          <p className="text-xs text-stone-500 mt-1 text-center">
            Bitte vergeben Sie ein neues Passwort, um fortzufahren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Neues Passwort */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">
              Neues Passwort
            </label>
            <input
              type="password"
              value={newPw1}
              onChange={(e) => setNewPw1(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
              placeholder="Neues Passwort"
              required
            />
          </div>

          {/* Wiederholen */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">
              Neues Passwort wiederholen
            </label>
            <input
              type="password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
              placeholder="Passwort wiederholen"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Passwort speichern
          </button>
        </form>
      </div>
    </div>
  );
}