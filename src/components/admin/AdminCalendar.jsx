// src/components/admin/AdminCalendar.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { useToast } from "../ui/Toast";

// Kategorie-Konfiguration
const CATEGORIES = {
  closed: {
    label: "Geschlossen",
    color: "bg-red-500",
    lightColor: "bg-red-100",
    textColor: "text-red-700",
  },
  parent_event: {
    label: "Elternvertreterversammlung",
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
  celebration: {
    label: "Fest / Feier",
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  other: {
    label: "Sonstiges",
    color: "bg-stone-500",
    lightColor: "bg-stone-100",
    textColor: "text-stone-700",
  },
};

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export default function AdminCalendar({ user, onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { showSuccess, showError } = useToast();

  // Modal States
  const [editModal, setEditModal] = useState(null); // null | 'new' | event object
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    date_start: "",
    date_end: "",
    time_info: "",
    category: "other",
    notes: "",
  });

  // Daten laden - auch jahresübergreifende Termine berücksichtigen
  const loadEvents = useCallback(async () => {
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
      showError("Termine konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showError]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Modal öffnen
  const openNewModal = () => {
    setFormData({
      title: "",
      date_start: "",
      date_end: "",
      time_info: "",
      category: "other",
      notes: "",
    });
    setEditModal("new");
  };

  const openEditModal = (event) => {
    setFormData({
      title: event.title || "",
      date_start: event.date_start || "",
      date_end: event.date_end || "",
      time_info: event.time_info || "",
      category: event.category || "other",
      notes: event.notes || "",
    });
    setEditModal(event);
  };

  // Speichern
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.date_start) {
      showError("Titel und Startdatum sind erforderlich");
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        facility_id: FACILITY_ID,
        title: formData.title.trim(),
        date_start: formData.date_start,
        date_end: formData.date_end || null,
        time_info: formData.time_info || null,
        category: formData.category,
        notes: formData.notes || null,
      };

      if (editModal === "new") {
        eventData.created_by = user?.id;
        const { error } = await supabase.from("facility_events").insert(eventData);
        if (error) throw error;
        showSuccess("Termin erstellt");
      } else {
        const { error } = await supabase
          .from("facility_events")
          .update({ ...eventData, updated_at: new Date().toISOString() })
          .eq("id", editModal.id);
        if (error) throw error;
        showSuccess("Termin aktualisiert");
      }

      setEditModal(null);
      loadEvents();
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      showError("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  // Löschen
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from("facility_events")
        .delete()
        .eq("id", deleteConfirm.id);

      if (error) throw error;
      showSuccess("Termin gelöscht");
      setDeleteConfirm(null);
      loadEvents();
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      showError("Löschen fehlgeschlagen");
    }
  };

  // Events nach Monat gruppieren - jahresübergreifende Termine in relevanten Monaten
  const eventsByMonth = {};
  MONTHS.forEach((_, idx) => {
    eventsByMonth[idx] = [];
  });
  events.forEach((event) => {
    const startDate = new Date(event.date_start);
    const endDate = event.date_end ? new Date(event.date_end) : startDate;
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    // Bestimme welche Monate im ausgewählten Jahr betroffen sind
    if (startYear === selectedYear && endYear === selectedYear) {
      // Termin komplett im ausgewählten Jahr - nur Startmonat
      eventsByMonth[startDate.getMonth()].push(event);
    } else if (startYear === selectedYear && endYear > selectedYear) {
      // Termin beginnt im ausgewählten Jahr, endet später
      for (let m = startDate.getMonth(); m <= 11; m++) {
        eventsByMonth[m].push(event);
      }
    } else if (startYear < selectedYear && endYear === selectedYear) {
      // Termin begann vorher, endet im ausgewählten Jahr
      for (let m = 0; m <= endDate.getMonth(); m++) {
        eventsByMonth[m].push(event);
      }
    } else if (startYear < selectedYear && endYear > selectedYear) {
      // Termin umspannt das ganze Jahr
      for (let m = 0; m <= 11; m++) {
        eventsByMonth[m].push(event);
      }
    }
  });

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  // Jahresgrenzen: nur letztes, aktuelles und nächstes Jahr (wie für Eltern)
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 1;
  const maxYear = currentYear + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Terminverwaltung</h2>
          <p className="text-xs text-stone-500 mt-1">
            Jahresplanung und wichtige Termine verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear((y) => Math.max(minYear, y - 1))}
            disabled={selectedYear <= minYear}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold text-stone-800 min-w-[60px] text-center">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((y) => Math.min(maxYear, y + 1))}
            disabled={selectedYear >= maxYear}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Neuer Termin Button */}
      <button
        onClick={openNewModal}
        className="w-full py-3 border-2 border-dashed border-amber-300 text-amber-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
      >
        <Plus size={18} />
        Neuen Termin hinzufügen
      </button>

      {/* Statistik */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-amber-600">{events.length}</p>
            <p className="text-xs text-stone-500">Termine gesamt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {events.filter((e) => e.category === "closed").length}
            </p>
            <p className="text-xs text-stone-500">Schließtage</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {events.filter((e) => e.category === "parent_event").length}
            </p>
            <p className="text-xs text-stone-500">Versammlungen</p>
          </div>
        </div>
      </div>

      {/* Events nach Monat */}
      <div className="space-y-4">
        {MONTHS.map((monthName, monthIdx) => {
          const monthEvents = eventsByMonth[monthIdx];
          const hasEvents = monthEvents.length > 0;

          return (
            <div
              key={monthIdx}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
            >
              {/* Monats-Header */}
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-bold text-stone-700">{monthName}</h3>
                <span className="text-xs text-stone-500">
                  {monthEvents.length} {monthEvents.length === 1 ? "Termin" : "Termine"}
                </span>
              </div>

              {/* Events */}
              <div className="p-3">
                {hasEvents ? (
                  <div className="space-y-2">
                    {monthEvents.map((event) => {
                      const cat = CATEGORIES[event.category] || CATEGORIES.other;

                      return (
                        <div
                          key={event.id}
                          className={`p-3 rounded-xl border ${cat.lightColor} ${cat.textColor.replace("text-", "border-").replace("700", "200")}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                                <span className="text-sm font-semibold text-stone-800">
                                  {event.title}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${cat.lightColor} ${cat.textColor} font-medium`}>
                                  {cat.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-stone-600 pl-4">
                                <span>{formatDate(event.date_start, event.date_end)}</span>
                                {event.time_info && (
                                  <>
                                    <span>•</span>
                                    <span>{event.time_info}</span>
                                  </>
                                )}
                              </div>
                              {event.notes && (
                                <p className="text-xs text-stone-500 pl-4 mt-1 truncate">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(event)}
                                className="p-2 rounded-lg hover:bg-white/50 text-stone-600"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(event)}
                                className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 text-center py-4">
                    Keine Termine in diesem Monat
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT/NEW MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <CalendarIcon size={20} className="text-amber-500" />
                {editModal === "new" ? "Neuer Termin" : "Termin bearbeiten"}
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="p-1 rounded-lg hover:bg-stone-100"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Titel */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                  placeholder="z.B. Teamsitzung"
                />
              </div>

              {/* Kategorie */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Kategorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                >
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Datum Start */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Datum (Start) *
                </label>
                <input
                  type="date"
                  value={formData.date_start}
                  onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                />
              </div>

              {/* Datum Ende (optional) */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Datum (Ende) — optional für mehrtägige Events
                </label>
                <input
                  type="date"
                  value={formData.date_end}
                  onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                  min={formData.date_start}
                />
              </div>

              {/* Uhrzeit / Zeit-Info */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Uhrzeit / Zeitangabe — optional
                </label>
                <input
                  type="text"
                  value={formData.time_info}
                  onChange={(e) => setFormData({ ...formData, time_info: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                  placeholder="z.B. Ab 16 Uhr, 15-17 Uhr, Vormittags"
                />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Notizen — optional
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm resize-none"
                  rows={2}
                  placeholder="z.B. Kinderhaus geschlossen"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.title.trim() || !formData.date_start}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={22} />
              <h3 className="text-sm font-bold text-stone-800">Termin löschen?</h3>
            </div>
            <p className="text-sm text-stone-600">
              Soll <span className="font-semibold">"{deleteConfirm.title}"</span> wirklich
              gelöscht werden?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
