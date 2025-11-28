// src/components/profile/ProfileNotifications.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { StorageService } from "../../lib/storage";

const PREF_KEY = "notification_prefs";
const OPTIONS = ["email", "app", "both", "off"];

export default function ProfileNotifications({ user, onBack }) {
  const [prefs, setPrefs] = useState({});

  useEffect(() => {
    const all = StorageService.get(PREF_KEY) || {};
    setPrefs(all[user.username] || {});
  }, [user.username]);

  let categories;
  if (user.role === "parent") {
    categories = ["news", "lists", "food"];
  } else if (user.role === "team") {
    categories = ["absences", "lists", "birthdays"];
  } else {
    // admin
    categories = ["news", "absences"];
  }

  const savePref = (cat, val) => {
    const all = StorageService.get(PREF_KEY) || {};
    const userPrefs = all[user.username] || {};
    userPrefs[cat] = val;
    all[user.username] = userPrefs;
    StorageService.set(PREF_KEY, all);
    setPrefs(userPrefs);
  };

  const labelMap = {
    news: "Neue Mitteilung der Kita",
    lists:
      user.role === "parent"
        ? "Neue Listen / Abstimmungen"
        : "Neue Aktivität auf Listen",
    food: "Neuer Speiseplan",
    absences:
      user.role === "team" || user.role === "admin"
        ? "Neue Abwesenheitsmeldungen"
        : "Abwesenheiten",
    birthdays: "Geburtstage in meiner Gruppe",
  };

  const optionText = {
    email: "E-Mail",
    app: "App",
    both: "Beides",
    off: "Aus",
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

      <h2 className="text-lg font-bold text-stone-800">
        Benachrichtigungen
      </h2>

      <div className="space-y-5">
        {categories.map((c) => (
          <div
            key={c}
            className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3"
          >
            <p className="font-semibold text-sm text-stone-800">
              {labelMap[c]}
            </p>

            <div className="grid grid-cols-4 gap-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => savePref(c, opt)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    prefs[c] === opt
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
                  }`}
                >
                  {optionText[opt]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}