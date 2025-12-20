// src/components/group/CreateListModal.jsx
import React, { useState, useEffect } from "react";
import { X, Calendar, List, Vote, ClipboardList } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { sendListPushNotifications } from "../../api/pushApi";

// Wochentage für Dropdown
const WEEKDAYS = [
  { value: 0, label: "Sonntag" },
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
];

// Hilfsfunktion: Finde nächsten Wochentag ab Startdatum
function findNextWeekday(startDate, targetWeekday) {
  const date = new Date(startDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (targetWeekday - currentDay + 7) % 7;
  date.setDate(date.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget));
  return date;
}

// Hilfsfunktion: Wochen addieren
function addWeeks(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

// Hilfsfunktion: Datum formatieren (deutsch)
function formatDateGerman(date) {
  const weekdayShort = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${weekdayShort}, ${day}.${month}.${year}`;
}

// Generiere Diensttermine basierend auf Konfiguration
function generateDutyDates(config) {
  const { weekday, interval, startDate, endType, endValue } = config;
  const dates = [];
  let current = findNextWeekday(new Date(startDate), weekday);
  const maxDates = 52;

  while (dates.length < maxDates) {
    if (endType === "count" && dates.length >= endValue) break;
    if (endType === "date" && current > new Date(endValue)) break;

    dates.push({
      label: formatDateGerman(current),
      date: current.toISOString().split("T")[0],
      assignedTo: null,
      assignedName: null,
    });

    current = addWeeks(current, interval);
  }

  return dates;
}

// Listen-Typ Icons und Labels
const LIST_TYPES = [
  { value: "bring", label: "Mitbringliste", icon: List, description: "Eltern tragen sich für Gegenstände ein" },
  { value: "duty", label: "Dienstliste", icon: ClipboardList, description: "Wiederkehrende Termine mit Datum" },
  { value: "poll", label: "Abstimmung", icon: Vote, description: "Eltern stimmen über Optionen ab" },
];

export default function CreateListModal({ isOpen, onClose, activeGroup, groupName, reload }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("bring");
  const [itemsText, setItemsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll-Konfiguration
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showStatsToParents, setShowStatsToParents] = useState(false);

  // Duty-Konfiguration
  const [dutyConfig, setDutyConfig] = useState({
    weekday: 5,
    interval: 1,
    startDate: new Date().toISOString().split("T")[0],
    endType: "count",
    endValue: 10,
    showNext: 5,
  });

  // Reset beim Öffnen
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setType("bring");
      setItemsText("");
      setIsAnonymous(true);
      setShowStatsToParents(false);
      setDutyConfig({
        weekday: 5,
        interval: 1,
        startDate: new Date().toISOString().split("T")[0],
        endType: "count",
        endValue: 10,
        showNext: 5,
      });
    }
  }, [isOpen]);

  const updateDutyConfig = (key, value) => {
    setDutyConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!title.trim() || !activeGroup) return;
    setIsSubmitting(true);

    try {
      let formattedItems = [];
      let config = {};

      if (type === "duty") {
        formattedItems = generateDutyDates(dutyConfig);
        config = { ...dutyConfig };

        if (formattedItems.length === 0) {
          alert("Keine Termine generiert. Bitte Einstellungen prüfen.");
          setIsSubmitting(false);
          return;
        }
      } else if (type === "poll") {
        formattedItems = itemsText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => ({ label: l, votes: [] }));
        config = { isAnonymous, showStatsToParents };

        // Polls brauchen mindestens 2 Optionen
        if (formattedItems.length < 2) {
          alert("Bitte mindestens zwei Optionen für die Abstimmung eingeben.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // bring - leere Listen sind erlaubt
        formattedItems = itemsText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => ({ label: l, assignedTo: null }));
      }

      const payload = {
        id: crypto.randomUUID(),
        title: title.trim(),
        type,
        group_id: activeGroup,
        items: formattedItems,
        config: (type === "duty" || type === "poll") ? config : {},
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("group_lists").insert(payload);

      if (error) {
        console.error("Fehler beim Speichern der Liste:", error);
        alert("Fehler beim Speichern.");
        setIsSubmitting(false);
        return;
      }

      sendListPushNotifications(payload, activeGroup, groupName).catch(console.error);

      onClose();
      reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vorschau der generierten Termine
  const previewDates = type === "duty" ? generateDutyDates(dutyConfig) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-800">Neue Liste anlegen</h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Titel */}
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1">
              Titel
            </label>
            <input
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              placeholder="z.B. Weihnachtsfeier Mitbringsel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Listentyp */}
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-2">
              Art der Liste
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LIST_TYPES.map((lt) => {
                const Icon = lt.icon;
                const isSelected = type === lt.value;
                return (
                  <button
                    key={lt.value}
                    onClick={() => setType(lt.value)}
                    className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                      isSelected
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{lt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-2">
              {LIST_TYPES.find((lt) => lt.value === type)?.description}
            </p>
          </div>

          {/* Duty-Konfiguration */}
          {type === "duty" && (
            <div className="bg-amber-50 p-4 rounded-xl space-y-4 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                <Calendar size={16} />
                <span>Wiederkehrende Termine</span>
              </div>

              {/* Wochentag & Intervall */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    Wochentag
                  </label>
                  <select
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                    value={dutyConfig.weekday}
                    onChange={(e) =>
                      updateDutyConfig("weekday", parseInt(e.target.value))
                    }
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    Intervall
                  </label>
                  <select
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                    value={dutyConfig.interval}
                    onChange={(e) =>
                      updateDutyConfig("interval", parseInt(e.target.value))
                    }
                  >
                    <option value={1}>Jede Woche</option>
                    <option value={2}>Alle 2 Wochen</option>
                    <option value={3}>Alle 3 Wochen</option>
                    <option value={4}>Alle 4 Wochen</option>
                  </select>
                </div>
              </div>

              {/* Startdatum */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                  value={dutyConfig.startDate}
                  onChange={(e) => updateDutyConfig("startDate", e.target.value)}
                />
              </div>

              {/* Ende */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">
                  Ende
                </label>
                <div className="flex gap-2">
                  <select
                    className="p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                    value={dutyConfig.endType}
                    onChange={(e) => {
                      updateDutyConfig("endType", e.target.value);
                      updateDutyConfig(
                        "endValue",
                        e.target.value === "count"
                          ? 10
                          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                              .toISOString()
                              .split("T")[0]
                      );
                    }}
                  >
                    <option value="count">Nach Anzahl</option>
                    <option value="date">Bis Datum</option>
                  </select>

                  {dutyConfig.endType === "count" ? (
                    <input
                      type="number"
                      min="1"
                      max="52"
                      className="flex-1 p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                      value={dutyConfig.endValue}
                      onChange={(e) =>
                        updateDutyConfig(
                          "endValue",
                          Math.min(52, Math.max(1, parseInt(e.target.value) || 1))
                        )
                      }
                    />
                  ) : (
                    <input
                      type="date"
                      className="flex-1 p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                      value={dutyConfig.endValue}
                      onChange={(e) =>
                        updateDutyConfig("endValue", e.target.value)
                      }
                    />
                  )}
                </div>
              </div>

              {/* Anzeige-Limit */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">
                  Anzeige in der Liste
                </label>
                <select
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-sm"
                  value={dutyConfig.showNext}
                  onChange={(e) =>
                    updateDutyConfig("showNext", parseInt(e.target.value))
                  }
                >
                  <option value={0}>Alle Termine anzeigen</option>
                  <option value={3}>Nur nächste 3 Termine</option>
                  <option value={5}>Nur nächste 5 Termine</option>
                  <option value={10}>Nur nächste 10 Termine</option>
                </select>
              </div>

              {/* Vorschau */}
              {previewDates.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-stone-200">
                  <div className="text-xs font-medium text-stone-500 mb-2">
                    Vorschau ({previewDates.length} Termine)
                  </div>
                  <div className="text-sm text-stone-700 space-y-1 max-h-32 overflow-y-auto">
                    {previewDates.slice(0, 6).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        {d.label}
                      </div>
                    ))}
                    {previewDates.length > 6 && (
                      <div className="text-stone-400 text-xs pt-1">
                        + {previewDates.length - 6} weitere Termine
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Textarea für bring/poll */}
          {type !== "duty" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">
                  {type === "poll" ? "Antwortoptionen" : "Einträge (optional)"}
                </label>
                <textarea
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder={
                    type === "poll"
                      ? "Eine Option pro Zeile eingeben…\n\nBeispiel:\nOption A\nOption B\nOption C"
                      : "Einen Eintrag pro Zeile eingeben…\n\nBeispiel:\nKuchen\nGetränke\nServietten\n\n(Kann auch leer gelassen werden)"
                  }
                  value={itemsText}
                  onChange={(e) => setItemsText(e.target.value)}
                />
                <p className="text-xs text-stone-400 mt-1">
                  {itemsText.split("\n").filter((l) => l.trim()).length} Einträge
                  {type === "bring" && itemsText.split("\n").filter((l) => l.trim()).length === 0 && (
                    <span className="text-amber-600 ml-2">— Eltern können eigene Einträge hinzufügen</span>
                  )}
                </p>
              </div>

              {/* Poll-Optionen: Anonymität & Statistik-Sichtbarkeit */}
              {type === "poll" && (
                <div className="space-y-3">
                  {/* Anonymität */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!isAnonymous}
                        onChange={(e) => setIsAnonymous(!e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-600 border-stone-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-stone-700">
                          Namen anzeigen
                        </span>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {isAnonymous
                            ? "Abstimmung ist anonym"
                            : "Kitateam sieht, wer für welche Option gestimmt hat"
                          }
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Statistik für Eltern sichtbar */}
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showStatsToParents}
                        onChange={(e) => setShowStatsToParents(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-stone-700">
                          Beteiligung für Eltern sichtbar
                        </span>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {showStatsToParents
                            ? "Eltern sehen, wie viele bereits abgestimmt haben"
                            : "Nur Kitateam sieht die Anzahl der Abstimmenden"
                          }
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || isSubmitting}
              className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Wird erstellt…" : "Liste erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
