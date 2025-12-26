import React, { useState, useEffect, useMemo } from "react";
import { Trash2, Pencil, Loader2, CalendarDays, AlertCircle, MessageSquare, CheckCircle } from "lucide-react";
import AbsenceEditor from "./AbsenceEditor";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";
import { sendAbsencePushNotifications } from "../../api/pushApi";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateRange(from, to) {
  if (!from && !to) return "";
  if (!to || from === to) return formatDate(from);

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return `${from} – ${to}`;
  }

  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const sameMonth = sameYear && fromDate.getMonth() === toDate.getMonth();

  const fromLabel = fromDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: sameYear && sameMonth ? undefined : "numeric",
  });

  const toLabel = toDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${fromLabel} – ${toLabel}`;
}

function getReasonMeta(reason) {
  switch (reason) {
    case "krankheit":
      return { label: "Krankheit", className: "bg-amber-100 text-amber-900" };
    case "urlaub":
      return { label: "Urlaub", className: "bg-emerald-100 text-emerald-900" };
    case "termin":
      return { label: "Termin", className: "bg-sky-100 text-sky-900" };
    case "sonstiges":
      return { label: "Sonstiges", className: "bg-stone-100 text-stone-800" };
    default:
      return { label: reason, className: "bg-stone-100 text-stone-800" };
  }
}

export default function AbsenceReport({ user }) {
  const children = Array.isArray(user.children) ? user.children : [];

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChildId, setActiveChildId] = useState(
    children.length > 0 ? children[0].id : null
  );
  const [editing, setEditing] = useState(null);
  const [entries, setEntries] = useState([]);

  // Gruppen laden
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .order("position");
        setGroups(data || []);
      } catch (err) {
        console.error("Gruppen laden fehlgeschlagen:", err);
      }
    }
    loadGroups();
  }, []);

  // Absences für aktives Kind laden
  useEffect(() => {
    if (activeChildId) {
      loadAbsences();
    }
  }, [activeChildId]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("absences")
        .select("*")
        .eq("child_id", activeChildId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format für Kompatibilität
      const formatted = (data || []).map(a => ({
        id: a.id,
        childId: a.child_id,
        childName: a.child_name,
        groupId: a.group_id,
        type: a.type,
        dateFrom: a.date_from,
        dateTo: a.date_to,
        reason: a.reason,
        otherText: a.other_text,
        status: a.status,
        createdAt: a.created_at,
        // Neue Felder für Team-Antwort
        staffResponse: a.staff_response,
        staffResponseAt: a.staff_response_at,
        responseAcknowledged: a.response_acknowledged,
      }));

      setEntries(formatted);
    } catch (err) {
      console.error("Absences laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  };

  const save = async (entry) => {
    try {
      const dbEntry = {
        facility_id: FACILITY_ID,
        child_id: entry.childId,
        child_name: entry.childName,
        group_id: entry.groupId,
        type: entry.type,
        date_from: entry.dateFrom,
        date_to: entry.dateTo,
        reason: entry.reason,
        other_text: entry.otherText || null,
        status: entry.status || "new",
        created_by: user.id,
      };

      // Prüfen ob Update oder Insert
      const existingIdx = entries.findIndex(e => e.id === entry.id);
      const isNewEntry = existingIdx === -1;

      if (isNewEntry) {
        // Insert
        const { error } = await supabase
          .from("absences")
          .insert(dbEntry);

        if (error) throw error;

        // Push-Benachrichtigung an Team senden (nur bei neuen Meldungen)
        sendAbsencePushNotifications(
          { ...dbEntry, childName: entry.childName },
          entry.groupId
        ).catch(console.error);
      } else {
        // Update
        const { error } = await supabase
          .from("absences")
          .update({
            ...dbEntry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        if (error) throw error;
      }

      setEditing(null);
      loadAbsences();
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Meldung löschen?")) return;

    try {
      const { error } = await supabase
        .from("absences")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadAbsences();
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      alert("Fehler beim Löschen: " + err.message);
    }
  };

  // Antwort der Kita bestätigen
  const acknowledgeResponse = async (id) => {
    try {
      const { error } = await supabase
        .from("absences")
        .update({
          response_acknowledged: true,
          response_acknowledged_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      loadAbsences();

      // Badge in Navigation aktualisieren
      window.dispatchEvent(new CustomEvent("refreshAbsenceBadge"));
    } catch (err) {
      console.error("Bestätigung fehlgeschlagen:", err);
    }
  };

  // Anzahl unbestätigter Antworten für Badge
  const unacknowledgedCount = useMemo(() => {
    return entries.filter(e => e.staffResponse && !e.responseAcknowledged).length;
  }, [entries]);

  const child = children.find((c) => c.id === activeChildId) || children[0] || null;

  const dateLabel = (e) => {
    if (e.type === "single") return formatDate(e.dateFrom);
    return formatDateRange(e.dateFrom, e.dateTo);
  };

  if (!child) {
    return (
      <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-300">
        Für dieses Profil sind aktuell keine Kinder hinterlegt.
      </div>
    );
  }

  const displayGroups = groups.filter(g => !g.is_event_group);

  // Aktives Kind für Header-Styling
  const activeChild = children.find((c) => c.id === activeChildId);
  const activeGroupStyles = activeChild
    ? getGroupStyles(getGroupById(displayGroups, activeChild.group))
    : null;

  return (
    <div className="space-y-5">
      {/* === HEADER - UI Review Update === */}
      <div
        className="p-6 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col gap-3"
        style={{
          backgroundColor: activeGroupStyles?.headerColor || "#f8f9fa",
        }}
      >
        {/* Header Row */}
        <div className="flex items-center gap-3">
          <div
            className={`${
              activeGroupStyles?.chipClass || "bg-stone-400"
            } p-2 rounded-2xl text-white shadow`}
          >
            {activeGroupStyles ? (
              <activeGroupStyles.Icon size={20} />
            ) : (
              <CalendarDays size={20} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Meldungen</h2>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              {children.length === 1
                ? `Abwesenheiten für ${child.name}`
                : "Abwesenheiten melden und verwalten"}
            </p>
          </div>
        </div>

        {/* Kind-Chips (wenn mehrere Kinder) */}
        {children.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {children.map((c) => {
              const groupStyles = getGroupStyles(
                getGroupById(displayGroups, c.group)
              );
              const active = c.id === activeChildId;

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChildId(c.id);
                    setEditing(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition ${
                    active
                      ? `${groupStyles.chipClass} border-transparent text-white`
                      : "bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                  }`}
                >
                  <groupStyles.Icon size={14} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* === END HEADER === */}

      {/* === INFO-BANNER - UI Review Update === */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <p className="text-sm leading-snug">
          <strong className="font-semibold">Bitte meldet euer Kind rechtzeitig ab.</strong><br />
          Bei Krankheit am gleichen Tag bis <strong>08:00 Uhr</strong> wegen der Essensplanung,
          bei Urlauben frühzeitig.
        </p>
      </div>
      {/* === END INFO-BANNER === */}

      {/* Editor */}
      {child && (
        <AbsenceEditor
          mode={editing ? "edit" : "create"}
          initialData={editing}
          child={child}
          groups={displayGroups}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 flex justify-center">
            <Loader2 className="animate-spin text-amber-500" size={24} />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 text-center text-stone-500 dark:text-stone-400 text-sm">
            Keine bisherigen Meldungen.
          </div>
        ) : (
          entries.map((e) => {
            const groupStyles = getGroupStyles(
              getGroupById(displayGroups, e.groupId)
            );
            const reasonMeta = getReasonMeta(e.reason);
            const submittedAt = new Date(e.createdAt).toLocaleString("de-DE");

            const hasUnacknowledgedResponse = e.staffResponse && !e.responseAcknowledged;

            return (
              <div
                key={e.id}
                className={`bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border ${
                  hasUnacknowledgedResponse
                    ? "border-amber-300 ring-2 ring-amber-100 dark:border-amber-600 dark:ring-amber-900/30"
                    : "border-stone-100 dark:border-stone-700"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {e.childName || child.name}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                          {dateLabel(e)}
                        </p>
                      </div>
                      {/* Badge für unbestätigte Antwort */}
                      {hasUnacknowledgedResponse && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                          <MessageSquare size={12} />
                          Nachricht der Kita
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reasonMeta.className}`}
                      >
                        {reasonMeta.label}
                      </span>
                    </div>

                    {/* Hinweis anzeigen (immer, nicht nur bei sonstiges) */}
                    {e.otherText && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-900 p-2 rounded-lg">
                        <span className="font-medium">Hinweis:</span> {e.otherText}
                      </p>
                    )}

                    {/* Antwort der Kita anzeigen */}
                    {e.staffResponse && (
                      <div className={`mt-2 p-3 rounded-xl ${
                        e.responseAcknowledged
                          ? "bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                          : "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
                      }`}>
                        <div className="flex items-start gap-2">
                          <MessageSquare size={14} className={e.responseAcknowledged ? "text-stone-500 dark:text-stone-400" : "text-amber-600 dark:text-amber-400"} />
                          <div className="flex-1">
                            <p className={`text-[10px] font-semibold mb-1 ${
                              e.responseAcknowledged ? "text-stone-600 dark:text-stone-400" : "text-amber-800 dark:text-amber-300"
                            }`}>
                              Rückmeldung der Kita:
                            </p>
                            <p className={`text-sm ${
                              e.responseAcknowledged ? "text-stone-700 dark:text-stone-200" : "text-amber-900 dark:text-amber-100"
                            }`}>
                              {e.staffResponse}
                            </p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                              {new Date(e.staffResponseAt).toLocaleString("de-DE")}
                            </p>

                            {/* Bestätigen-Button */}
                            {!e.responseAcknowledged && (
                              <button
                                onClick={() => acknowledgeResponse(e.id)}
                                className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
                              >
                                <CheckCircle size={14} />
                                Zur Kenntnis genommen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {groupStyles && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${groupStyles.chipClass}`}
                      >
                        <groupStyles.Icon size={12} />
                        <span>{groupStyles.name}</span>
                      </span>
                    )}

                    <div className="flex gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="p-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-2">
                  Eingereicht am {submittedAt}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
