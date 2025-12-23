// src/components/profile/ProfileNotifications.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";

const OPTIONS = ["email", "app", "both", "off"];

export default function ProfileNotifications({ user, onBack }) {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("category, preference")
          .eq("user_id", user.id);

        if (error) throw error;

        // Array zu Object konvertieren
        const prefsObj = {};
        (data || []).forEach(p => {
          prefsObj[p.category] = p.preference;
        });
        setPrefs(prefsObj);
      } catch (err) {
        console.error("Notification prefs laden fehlgeschlagen:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, [user.id]);

  let categories;
  if (user.role === "parent") {
    categories = ["news", "lists", "food", "absence_response"];
  } else if (user.role === "team") {
    categories = ["absences", "lists", "birthdays"];
  } else {
    // admin
    categories = ["news", "absences"];
  }

  const savePref = async (cat, val) => {
    try {
      // Upsert: Insert oder Update
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          category: cat,
          preference: val,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,category"
        });

      if (error) throw error;

      setPrefs(prev => ({ ...prev, [cat]: val }));
    } catch (err) {
      console.error("Notification pref speichern fehlgeschlagen:", err);
    }
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
    absence_response: "Rückmeldung zu Abwesenheitsmeldungen",
  };

  const optionText = {
    email: "E-Mail",
    app: "App",
    both: "Beides",
    off: "Aus",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

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