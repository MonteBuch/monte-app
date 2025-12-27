// src/components/profile/ProfileNotifications.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Mail, Bell, CircleDot } from "lucide-react";
import { supabase } from "../../api/supabaseClient";

// Toggle-Switch Komponente
function Toggle({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-800 ${
        enabled
          ? "bg-amber-500"
          : "bg-stone-300 dark:bg-stone-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function ProfileNotifications({ user, onBack }) {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("category, email_enabled, app_enabled, badge_enabled, preference")
          .eq("user_id", user.id);

        if (error) throw error;

        // Array zu Object konvertieren
        const prefsObj = {};
        (data || []).forEach(p => {
          // Fallback für alte Daten ohne Boolean-Felder
          const emailEnabled = p.email_enabled ?? (p.preference === "email" || p.preference === "both");
          const appEnabled = p.app_enabled ?? (p.preference === "app" || p.preference === "both");
          const badgeEnabled = p.badge_enabled ?? true;

          prefsObj[p.category] = {
            email: emailEnabled,
            app: appEnabled,
            badge: badgeEnabled
          };
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

  // Kategorien basierend auf Rolle
  let categories;
  if (user.role === "parent") {
    categories = ["news", "lists", "food", "absence_response", "chat"];
  } else if (user.role === "team") {
    categories = ["absences", "lists", "birthdays"];
  } else {
    // admin
    categories = ["news", "absences"];
  }

  // Kategorien ohne Email-Unterstützung
  // Chat hat generell kein Email, Lists für Team auch nicht (zu viele Emails)
  const noEmailCategories = user.role === "team"
    ? ["chat", "lists"]
    : ["chat"];

  const savePref = async (category, field, value) => {
    // Aktuelle Werte für diese Kategorie
    const currentPrefs = prefs[category] || { email: true, app: true, badge: true };
    const newPrefs = { ...currentPrefs, [field]: value };

    // Optimistisches UI-Update
    setPrefs(prev => ({ ...prev, [category]: newPrefs }));

    try {
      // Prüfen ob Eintrag existiert
      const { data: existing, error: checkError } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", category)
        .maybeSingle();

      if (checkError) throw checkError;

      // Legacy-Preference-Wert berechnen (für Rückwärtskompatibilität)
      let legacyPreference = "off";
      if (newPrefs.email && newPrefs.app) legacyPreference = "both";
      else if (newPrefs.email) legacyPreference = "email";
      else if (newPrefs.app) legacyPreference = "app";

      const updateData = {
        email_enabled: newPrefs.email,
        app_enabled: newPrefs.app,
        badge_enabled: newPrefs.badge,
        preference: legacyPreference, // Rückwärtskompatibilität
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const result = await supabase
          .from("notification_preferences")
          .update(updateData)
          .eq("id", existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            category: category,
            ...updateData,
          });
        error = result.error;
      }

      if (error) throw error;
      console.log("[Notifications] Preference gespeichert:", category, field, value);

      // Event auslösen damit App.jsx die Badge-Präferenzen neu lädt
      if (field === "badge") {
        window.dispatchEvent(new CustomEvent("notificationPreferencesChanged"));
      }
    } catch (err) {
      console.error("[Notifications] Fehler:", err);
      // Rollback bei Fehler
      setPrefs(prev => ({ ...prev, [category]: currentPrefs }));
    }
  };

  const labelMap = {
    news: "Neue Mitteilung der Kita",
    lists:
      user.role === "parent"
        ? "Neue Listen / Abstimmungen"
        : "Neue Aktivität auf Listen",
    food: "Neuer Speiseplan",
    absences: "Neue Abwesenheitsmeldungen",
    birthdays: "Geburtstage in meiner Gruppe",
    absence_response: "Rückmeldung zu Abwesenheitsmeldungen",
    chat: "Neue Nachrichten im Gruppenchat",
  };

  const descriptionMap = {
    news: "Pinnwand-Beiträge der Kita",
    lists: user.role === "parent"
      ? "Einladungen zu Listen und Abstimmungen"
      : "Antworten und Änderungen auf Listen",
    food: "Wenn ein neuer Speiseplan veröffentlicht wird",
    absences: "Wenn Eltern eine Abwesenheit melden",
    birthdays: "Geburtstage der Kinder in deiner Gruppe",
    absence_response: "Wenn das Team auf deine Abwesenheitsmeldung antwortet",
    chat: "Nachrichten von anderen Eltern",
  };

  // Defaults für Kategorien ohne gespeicherte Prefs
  const getPrefs = (category) => {
    return prefs[category] || { email: true, app: true, badge: true };
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
        className="flex items-center text-stone-500 dark:text-stone-400 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
          Benachrichtigungen
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Wähle aus, wie du benachrichtigt werden möchtest
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const catPrefs = getPrefs(category);
          const hasEmail = !noEmailCategories.includes(category);

          return (
            <div
              key={category}
              className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700"
            >
              {/* Header */}
              <div className="mb-4">
                <p className="font-semibold text-stone-800 dark:text-stone-100">
                  {labelMap[category]}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {descriptionMap[category]}
                </p>
              </div>

              {/* Toggle-Rows */}
              <div className="space-y-3">
                {/* Email Toggle */}
                {hasEmail && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-stone-400" />
                      <span className="text-sm text-stone-600 dark:text-stone-300">
                        E-Mail
                      </span>
                    </div>
                    <Toggle
                      enabled={catPrefs.email}
                      onChange={(val) => savePref(category, "email", val)}
                    />
                  </div>
                )}

                {/* App/Push Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-stone-400" />
                    <span className="text-sm text-stone-600 dark:text-stone-300">
                      App-Benachrichtigung
                    </span>
                  </div>
                  <Toggle
                    enabled={catPrefs.app}
                    onChange={(val) => savePref(category, "app", val)}
                  />
                </div>

                {/* Badge Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot size={16} className="text-stone-400" />
                    <span className="text-sm text-stone-600 dark:text-stone-300">
                      Tab-Badge anzeigen
                    </span>
                  </div>
                  <Toggle
                    enabled={catPrefs.badge}
                    onChange={(val) => savePref(category, "badge", val)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info-Hinweis */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Hinweis:</strong> App-Benachrichtigungen funktionieren nur in der
          installierten App. Im Browser erhältst du bei aktivierter Option trotzdem
          eine Anzeige beim nächsten Öffnen.
        </p>
      </div>
    </div>
  );
}
