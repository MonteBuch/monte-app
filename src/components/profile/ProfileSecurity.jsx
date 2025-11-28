// src/components/profile/ProfileSecurity.jsx
import React, { useState } from "react";
import { ArrowLeft, Save, Fingerprint } from "lucide-react";
import { StorageService } from "../../lib/storage";

export default function ProfileSecurity({
  user,
  onBack,
  onUpdateUser,
  onDeleteAccount,
}) {
  const [oldPw, setOldPw] = useState("");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");

  const biomKey = `bio_${user.username}`;
  const [biometric, setBiometric] = useState(
    localStorage.getItem(biomKey) === "1"
  );

  const toggleBiometric = () => {
    const newVal = !biometric;
    setBiometric(newVal);
    localStorage.setItem(biomKey, newVal ? "1" : "0");
  };

  const handlePw = (e) => {
    e.preventDefault();
    setError("");

    if (!oldPw || !newPw1 || !newPw2) {
      return setError("Bitte alle Felder ausfüllen.");
    }
    if (oldPw !== user.password) {
      return setError("Das aktuelle Passwort ist falsch.");
    }
    if (newPw1 !== newPw2) {
      return setError("Neue Passwörter stimmen nicht überein.");
    }

    const all = StorageService.get("users");
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx === -1) return;

    const updated = { ...user, password: newPw1 };
    all[idx] = updated;
    StorageService.set("users", all);
    onUpdateUser(updated);

    alert("Passwort geändert.");
    setOldPw("");
    setNewPw1("");
    setNewPw2("");
  };

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        className="flex items-center text-stone-500 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800">Sicherheit</h2>

      {/* BIOMETRIC */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3 flex justify-between items-center">
        <div>
          <p className="font-semibold text-sm text-stone-800">
            Biometrischer Login
          </p>
          <p className="text-xs text-stone-500 mt-1">
            FaceID / Fingerprint aktivieren
          </p>
        </div>

        <button
          onClick={toggleBiometric}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            biometric
              ? "bg-amber-500 text-white"
              : "bg-stone-200 text-stone-600"
          }`}
        >
          {biometric ? "AN" : "AUS"}
        </button>
      </div>

      {/* PW CHANGE */}
      <form
        onSubmit={handlePw}
        className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3"
      >
        <p className="font-semibold text-sm text-stone-800">
          Passwort ändern
        </p>

        <input
          type="password"
          placeholder="Aktuelles Passwort"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
        />
        <input
          type="password"
          placeholder="Neues Passwort"
          value={newPw1}
          onChange={(e) => setNewPw1(e.target.value)}
          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
        />
        <input
          type="password"
          placeholder="Neues Passwort wiederholen"
          value={newPw2}
          onChange={(e) => setNewPw2(e.target.value)}
          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
        />

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold hover:bg-amber-600 active:scale-[0.99]"
        >
          <Save size={16} />
          Passwort speichern
        </button>
      </form>

      {/* DELETE */}
      <button
        onClick={onDeleteAccount}
        className="w-full bg-red-500 text-white rounded-xl py-3 font-bold hover:bg-red-600 active:scale-[0.99]"
      >
        Profil löschen
      </button>
    </div>
  );
}