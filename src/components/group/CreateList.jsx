// src/components/group/CreateList.jsx
import React, { useState } from "react";
import { Plus, Calendar } from "lucide-react";
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
  const maxDates = 52; // Sicherheitslimit

  while (dates.length < maxDates) {
    // Prüfe Ende-Bedingung
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

export default function CreateList({ activeGroup, groupName, reload }) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("bring"); // bring | duty | poll
  const [itemsText, setItemsText] = useState("");

  // Duty-Konfiguration
  const [dutyConfig, setDutyConfig] = useState({
    weekday: 5, // Freitag
    interval: 1, // Jede Woche
    startDate: new Date().toISOString().split("T")[0],
    endType: "count", // "count" oder "date"
    endValue: 10, // Anzahl oder Datum
    showNext: 5, // Zeige nächste X Einträge (0 = alle)
  });

  const updateDutyConfig = (key, value) => {
    setDutyConfig((prev) => ({ ...prev, [key]: value }));
  };

  const create = async () => {
    if (!title.trim() || !activeGroup) return;

    let formattedItems = [];
    let config = {};

    if (type === "duty") {
      // Generiere Termine basierend auf Konfiguration
      formattedItems = generateDutyDates(dutyConfig);
      config = { ...dutyConfig };

      if (formattedItems.length === 0) {
        alert("Keine Termine generiert. Bitte Einstellungen prüfen.");
        return;
      }
    } else if (type === "poll") {
      formattedItems = itemsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => ({ label: l, votes: [] }));
    } else {
      // bring
      formattedItems = itemsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => ({ label: l, assignedTo: null }));
    }

    if (type !== "duty" && formattedItems.length === 0) {
      alert("Bitte mindestens einen Eintrag hinzufügen.");
      return;
    }

    const payload = {
      id: crypto.randomUUID(),
      title: title.trim(),
      type,
      group_id: activeGroup,
      items: formattedItems,
      config: type === "duty" ? config : {},
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("group_lists").insert(payload);

    if (error) {
      console.error("Fehler beim Speichern der Liste:", error);
      return;
    }

    // Push-Benachrichtigung an Eltern senden
    sendListPushNotifications(payload, activeGroup, groupName).catch(
      console.error
    );

    // Reset
    setShow(false);
    setTitle("");
    setItemsText("");
    setType("bring");
    setDutyConfig({
      weekday: 5,
      interval: 1,
      startDate: new Date().toISOString().split("T")[0],
      endType: "count",
      endValue: 10,
      showNext: 5,
    });

    reload();
  };

  // Vorschau der generierten Termine
  const previewDates = type === "duty" ? generateDutyDates(dutyConfig) : [];

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 space-y-3">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-stone-800">Neue Liste anlegen</h3>

        <button
          onClick={() => setShow((s) => !s)}
          className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-amber-100"
        >
          <Plus size={16} />
        </button>
      </div>

      {show && (
        <div className="space-y-3">
          <input
            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            placeholder="Titel der Liste…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="bring">Mitbringliste</option>
            <option value="duty">Dienstliste</option>
            <option value="poll">Abstimmung</option>
          </select>

          {/* Duty-Konfiguration */}
          {type === "duty" && (
            <div className="bg-amber-50 p-3 rounded-lg space-y-3 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                <Calendar size={14} />
                <span>Wiederkehrende Termine</span>
              </div>

              {/* Wochentag */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    Wochentag
                  </label>
                  <select
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm"
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
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm"
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
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm"
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
                    className="p-2 bg-white border border-stone-200 rounded-lg text-sm"
                    value={dutyConfig.endType}
                    onChange={(e) => {
                      updateDutyConfig("endType", e.target.value);
                      // Reset endValue beim Wechsel
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
                      className="flex-1 p-2 bg-white border border-stone-200 rounded-lg text-sm"
                      value={dutyConfig.endValue}
                      onChange={(e) =>
                        updateDutyConfig(
                          "endValue",
                          Math.min(52, Math.max(1, parseInt(e.target.value) || 1))
                        )
                      }
                      placeholder="Anzahl"
                    />
                  ) : (
                    <input
                      type="date"
                      className="flex-1 p-2 bg-white border border-stone-200 rounded-lg text-sm"
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
                  Anzeige
                </label>
                <select
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm"
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
                <div className="mt-2 p-2 bg-white rounded-lg border border-stone-200">
                  <div className="text-xs text-stone-500 mb-1">
                    Vorschau ({previewDates.length} Termine):
                  </div>
                  <div className="text-xs text-stone-700 space-y-0.5 max-h-24 overflow-y-auto">
                    {previewDates.slice(0, 5).map((d, i) => (
                      <div key={i}>{d.label}</div>
                    ))}
                    {previewDates.length > 5 && (
                      <div className="text-stone-400">
                        + {previewDates.length - 5} weitere...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Textarea für bring/poll */}
          {type !== "duty" && (
            <textarea
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm min-h-[80px]"
              placeholder={
                type === "poll"
                  ? "Antwortoptionen, je Zeile eine"
                  : "Einträge, je Zeile einer"
              }
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
            />
          )}

          <button
            onClick={create}
            className="w-full bg-amber-500 text-white py-2 rounded-xl font-bold hover:bg-amber-600 transition"
          >
            Liste anlegen
          </button>
        </div>
      )}
    </div>
  );
}
