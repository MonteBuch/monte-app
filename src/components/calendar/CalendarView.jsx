// src/components/calendar/CalendarView.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Clock,
  Info,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";

// Kategorie-Konfiguration mit Farben
const CATEGORIES = {
  closed: {
    label: "Geschlossen",
    color: "bg-red-500",
    lightColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
  parent_event: {
    label: "Elternvertreterversammlung",
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-300",
  },
  celebration: {
    label: "Fest / Feier",
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-300",
  },
  other: {
    label: "Sonstiges",
    color: "bg-stone-500",
    lightColor: "bg-stone-100",
    textColor: "text-stone-700",
    borderColor: "border-stone-300",
  },
};

// Deutsche Monatsnamen
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  // Verfügbare Jahre laden (basierend auf Startdatum der Termine)
  const loadAvailableYears = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("facility_events")
        .select("date_start")
        .eq("facility_id", FACILITY_ID);

      if (error) throw error;

      // Extrahiere einzigartige Jahre aus date_start
      const years = [...new Set((data || []).map(e => new Date(e.date_start).getFullYear()))];
      years.sort((a, b) => a - b);

      setAvailableYears(years);

      // Setze selectedYear auf das aktuellste verfügbare Jahr oder aktuelles Jahr
      const currentYear = new Date().getFullYear();
      if (years.length > 0) {
        // Bevorzuge aktuelles Jahr wenn vorhanden, sonst nächstes verfügbares
        if (years.includes(currentYear)) {
          setSelectedYear(currentYear);
        } else {
          // Finde das nächste Jahr >= aktuelles Jahr, oder das letzte verfügbare
          const futureYears = years.filter(y => y >= currentYear);
          setSelectedYear(futureYears.length > 0 ? futureYears[0] : years[years.length - 1]);
        }
      }
    } catch (err) {
      console.error("Jahre laden fehlgeschlagen:", err);
    } finally {
      setYearsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAvailableYears();
  }, [loadAvailableYears]);

  // Daten laden - auch jahresübergreifende Termine berücksichtigen
  const loadEvents = useCallback(async () => {
    if (!yearsLoaded) return;

    try {
      // Lade Termine, deren Start ODER Ende im ausgewählten Jahr liegt
      const { data, error } = await supabase
        .from("facility_events")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .or(`date_start.gte.${selectedYear}-01-01,date_end.gte.${selectedYear}-01-01`)
        .or(`date_start.lte.${selectedYear}-12-31,date_end.lte.${selectedYear}-12-31`)
        .order("date_start", { ascending: true });

      if (error) throw error;

      // Filtere nur relevante Events für dieses Jahr
      const relevantEvents = (data || []).filter(event => {
        const startYear = new Date(event.date_start).getFullYear();
        const endYear = event.date_end ? new Date(event.date_end).getFullYear() : startYear;
        return startYear === selectedYear || endYear === selectedYear;
      });

      setEvents(relevantEvents);
    } catch (err) {
      console.error("Events laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, yearsLoaded]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Events nach Monat gruppieren - jahresübergreifende Termine in relevanten Monaten
  const eventsByMonth = useMemo(() => {
    const grouped = {};
    MONTHS.forEach((_, idx) => {
      grouped[idx] = [];
    });

    events.forEach((event) => {
      const startDate = new Date(event.date_start);
      const endDate = event.date_end ? new Date(event.date_end) : startDate;
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      // Bestimme welche Monate im ausgewählten Jahr betroffen sind
      if (startYear === selectedYear && endYear === selectedYear) {
        // Termin komplett im ausgewählten Jahr - nur Startmonat
        grouped[startDate.getMonth()].push(event);
      } else if (startYear === selectedYear && endYear > selectedYear) {
        // Termin beginnt im ausgewählten Jahr, endet später
        // Zeige in allen Monaten ab Startmonat bis Dezember
        for (let m = startDate.getMonth(); m <= 11; m++) {
          grouped[m].push(event);
        }
      } else if (startYear < selectedYear && endYear === selectedYear) {
        // Termin begann vorher, endet im ausgewählten Jahr
        // Zeige in allen Monaten von Januar bis Endmonat
        for (let m = 0; m <= endDate.getMonth(); m++) {
          grouped[m].push(event);
        }
      } else if (startYear < selectedYear && endYear > selectedYear) {
        // Termin umspannt das ganze Jahr
        for (let m = 0; m <= 11; m++) {
          grouped[m].push(event);
        }
      }
    });

    return grouped;
  }, [events, selectedYear]);

  // Datum formatieren - immer TT.MM.YY
  const formatDate = (dateStr, endDateStr) => {
    const start = new Date(dateStr);
    const startDay = start.getDate().toString().padStart(2, "0");
    const startMonth = (start.getMonth() + 1).toString().padStart(2, "0");
    const startYear = start.getFullYear().toString().slice(-2);

    if (endDateStr) {
      const end = new Date(endDateStr);
      const endDay = end.getDate().toString().padStart(2, "0");
      const endMonth = (end.getMonth() + 1).toString().padStart(2, "0");
      const endYear = end.getFullYear().toString().slice(-2);

      return `${startDay}.${startMonth}.${startYear} – ${endDay}.${endMonth}.${endYear}`;
    }

    return `${startDay}.${startMonth}.${startYear}`;
  };

  // Prüfen ob Event in der Vergangenheit liegt
  const isPast = (dateStr) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Prüfen ob Event heute ist
  const isToday = (dateStr, endDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);

    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(0, 0, 0, 0);
      return today >= start && today <= end;
    }
    return start.getTime() === today.getTime();
  };

  if (loading || !yearsLoaded) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  // Keine Termine vorhanden
  if (availableYears.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <CalendarIcon size={20} className="text-amber-500" />
          Terminübersicht
        </h2>
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <CalendarIcon size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500">Noch keine Termine vorhanden.</p>
        </div>
      </div>
    );
  }

  // Navigation-Hilfsvariablen
  const currentYearIndex = availableYears.indexOf(selectedYear);
  const canGoBack = currentYearIndex > 0;
  const canGoForward = currentYearIndex < availableYears.length - 1;

  return (
    <div className="space-y-6">
      {/* Header mit Jahresauswahl */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <CalendarIcon size={20} className="text-amber-500" />
          Terminübersicht
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => canGoBack && setSelectedYear(availableYears[currentYearIndex - 1])}
            disabled={!canGoBack}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold text-stone-800 min-w-[60px] text-center">
            {selectedYear}
          </span>
          <button
            onClick={() => canGoForward && setSelectedYear(availableYears[currentYearIndex + 1])}
            disabled={!canGoForward}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Legende */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
        <p className="text-xs font-semibold text-stone-500 uppercase mb-3">Legende</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.lightColor} ${cat.textColor}`}
            >
              <span className={`w-2 h-2 rounded-full ${cat.color}`} />
              {cat.label}
            </span>
          ))}
        </div>
      </div>

      {/* Monatsübersicht */}
      <div className="space-y-4">
        {MONTHS.map((monthName, monthIdx) => {
          const monthEvents = eventsByMonth[monthIdx];
          const hasEvents = monthEvents.length > 0;

          // Aktueller Monat?
          const isCurrentMonth =
            new Date().getFullYear() === selectedYear &&
            new Date().getMonth() === monthIdx;

          return (
            <div
              key={monthIdx}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                isCurrentMonth ? "border-amber-300 ring-2 ring-amber-100" : "border-stone-200"
              }`}
            >
              {/* Monats-Header */}
              <div
                className={`px-4 py-3 border-b ${
                  isCurrentMonth
                    ? "bg-amber-50 border-amber-200"
                    : "bg-stone-50 border-stone-100"
                }`}
              >
                <h3
                  className={`font-bold ${
                    isCurrentMonth ? "text-amber-700" : "text-stone-700"
                  }`}
                >
                  {monthName}
                  {isCurrentMonth && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      (aktuell)
                    </span>
                  )}
                </h3>
              </div>

              {/* Events */}
              <div className="p-3">
                {hasEvents ? (
                  <div className="space-y-2">
                    {monthEvents.map((event) => {
                      const cat = CATEGORIES[event.category] || CATEGORIES.other;
                      const past = isPast(event.date_end || event.date_start);
                      const today = isToday(event.date_start, event.date_end);

                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            today
                              ? `${cat.lightColor} ${cat.borderColor} border-2`
                              : past
                              ? "bg-stone-50 border-stone-100 opacity-60"
                              : `bg-white border-stone-200 hover:${cat.lightColor}`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.color}`}
                                />
                                <span className="text-sm font-semibold text-stone-800 truncate">
                                  {event.title}
                                </span>
                                {today && (
                                  <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">
                                    HEUTE
                                  </span>
                                )}
                              </div>
                              {event.notes && (
                                <p className="text-xs text-stone-500 truncate pl-4">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium text-stone-700">
                                {formatDate(event.date_start, event.date_end)}
                              </p>
                              {event.time_info && (
                                <p className="text-xs text-stone-500">
                                  {event.time_info}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 text-center py-4">
                    Keine Termine
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      CATEGORIES[selectedEvent.category]?.color || "bg-stone-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold uppercase ${
                      CATEGORIES[selectedEvent.category]?.textColor || "text-stone-600"
                    }`}
                  >
                    {CATEGORIES[selectedEvent.category]?.label || "Termin"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-800">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg hover:bg-stone-100"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Datum */}
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <CalendarIcon size={18} className="text-stone-500" />
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {formatDate(selectedEvent.date_start, selectedEvent.date_end)}
                    {selectedEvent.date_end && (
                      <span className="text-stone-500">
                        {" "}({Math.ceil(
                          (new Date(selectedEvent.date_end) - new Date(selectedEvent.date_start)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1} Tage)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Uhrzeit */}
              {selectedEvent.time_info && (
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <Clock size={18} className="text-stone-500" />
                  <p className="text-sm font-medium text-stone-800">
                    {selectedEvent.time_info}
                  </p>
                </div>
              )}

              {/* Notizen */}
              {selectedEvent.notes && (
                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                  <Info size={18} className="text-stone-500 mt-0.5" />
                  <p className="text-sm text-stone-700">{selectedEvent.notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
