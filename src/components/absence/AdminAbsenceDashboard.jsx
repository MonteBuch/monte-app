import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";
import { CheckCircle, Undo2, Trash2, CalendarDays, Loader2, MessageSquare, X } from "lucide-react";

const REASON_STYLES = {
  krankheit: "bg-amber-100 text-amber-900",
  termin: "bg-emerald-100 text-emerald-900",
  urlaub: "bg-sky-100 text-sky-900",
  sonstiges: "bg-stone-200 text-stone-800",
};

export default function AdminAbsenceDashboard({ user }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  // Team-User: Stammgruppe als Default, sonst "all"
  const [groupId, setGroupId] = useState(() => {
    if (user.role === "team" && user.primaryGroup) {
      return user.primaryGroup;
    }
    return "all";
  });
  const [activeTab, setActiveTab] = useState("new");
  const [entries, setEntries] = useState([]);
  const [allAbsences, setAllAbsences] = useState([]);

  // Antwort-Modal State
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);

  // Gruppen laden
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .eq("is_event_group", false)
          .order("position");

        const loadedGroups = data || [];
        setGroups(loadedGroups);

        // Initial groupId setzen
        if (!groupId && loadedGroups.length > 0) {
          setGroupId(user.primaryGroup || loadedGroups[0]?.id);
        }
      } catch (err) {
        console.error("Gruppen laden fehlgeschlagen:", err);
      }
    }
    loadGroups();
  }, []);

  // Absences laden und alte gelesene automatisch löschen
  const loadAbsences = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("absences")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Alte gelesene Meldungen identifizieren und löschen
      const toDelete = (data || []).filter((a) => {
        if (a.status !== "read") return false;

        // Relevantes Enddatum ermitteln (bei Einzeldatum = date_from, bei Zeitraum = date_to)
        const endDateStr = a.type === "single" ? a.date_from : a.date_to;
        const endDate = new Date(endDateStr);
        endDate.setHours(0, 0, 0, 0);

        // Löschen wenn Enddatum in der Vergangenheit liegt
        return endDate < today;
      });

      // Alte Meldungen löschen
      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map((a) => a.id);
        await supabase
          .from("absences")
          .delete()
          .in("id", idsToDelete);

        console.log(`${toDelete.length} vergangene gelesene Meldungen automatisch gelöscht.`);
      }

      // Nur nicht-gelöschte Meldungen formatieren
      const remaining = (data || []).filter((a) => !toDelete.some((d) => d.id === a.id));

      const formatted = remaining.map((a) => ({
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
        createdBy: a.created_by,
        // Neue Felder für Team-Antwort
        staffResponse: a.staff_response,
        staffResponseAt: a.staff_response_at,
        staffResponseBy: a.staff_response_by,
        responseAcknowledged: a.response_acknowledged,
      }));

      setAllAbsences(formatted);
    } catch (err) {
      console.error("Absences laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  // Entries für aktuelle Gruppe filtern (oder alle bei "all")
  useEffect(() => {
    if (groupId === "all") {
      // Alle Absences (außer Event-Gruppen)
      const filtered = allAbsences.filter((e) => {
        const isEventGroup = groups.find((g) => g.id === e.groupId)?.is_event_group;
        return !isEventGroup;
      });
      setEntries(filtered);
    } else if (groupId) {
      const filtered = allAbsences.filter((e) => e.groupId === groupId);
      setEntries(filtered);
    }
  }, [groupId, allAbsences, groups]);

  const markRead = async (id) => {
    try {
      const { error } = await supabase
        .from("absences")
        .update({ status: "read", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      loadAbsences();
    } catch (err) {
      console.error("Status ändern fehlgeschlagen:", err);
    }
  };

  const markUnread = async (id) => {
    try {
      const { error } = await supabase
        .from("absences")
        .update({ status: "new", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      loadAbsences();
    } catch (err) {
      console.error("Status ändern fehlgeschlagen:", err);
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

  // Antwort auf Abwesenheitsmeldung senden
  const sendResponse = async () => {
    if (!respondingTo || !responseText.trim()) return;

    setSendingResponse(true);
    try {
      const { error } = await supabase
        .from("absences")
        .update({
          staff_response: responseText.trim(),
          staff_response_at: new Date().toISOString(),
          staff_response_by: user.id,
          response_acknowledged: false,
          response_acknowledged_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", respondingTo.id);

      if (error) throw error;

      // TODO: Push-Notification an Eltern senden
      // sendAbsenceResponsePushNotification(respondingTo, responseText);

      setRespondingTo(null);
      setResponseText("");
      loadAbsences();
    } catch (err) {
      console.error("Antwort senden fehlgeschlagen:", err);
      alert("Fehler beim Senden: " + err.message);
    } finally {
      setSendingResponse(false);
    }
  };

  const openResponseModal = (entry) => {
    setRespondingTo(entry);
    setResponseText(entry.staffResponse || "");
  };

  const newEntries = entries
    .filter((e) => e.status === "new")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const readEntries = entries
    .filter((e) => e.status === "read")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const currentGroupRaw = useMemo(
    () => getGroupById(groups, groupId),
    [groups, groupId]
  );

  const currentGroup = useMemo(
    () => getGroupStyles(currentGroupRaw),
    [currentGroupRaw]
  );

  const unreadCountByGroup = useMemo(() => {
    return allAbsences.reduce((acc, e) => {
      // Event-Gruppen ausschließen
      const isEventGroup = groups.find((g) => g.id === e.groupId)?.is_event_group;
      if (isEventGroup) return acc;
      if (e.status !== "new") return acc;
      acc[e.groupId] = (acc[e.groupId] || 0) + 1;
      return acc;
    }, {});
  }, [allAbsences, groups]);

  // Gesamtzahl ungelesener Meldungen (für "Alle")
  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCountByGroup).reduce((sum, count) => sum + count, 0);
  }, [unreadCountByGroup]);

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("de-DE");
  }

  const dateLabel = (e) => {
    if (e.type === "single") return formatDate(e.dateFrom);
    return `${formatDate(e.dateFrom)} – ${formatDate(e.dateTo)}`;
  };

  const renderCard = (e, faded = false) => {
    const reasonStyle = REASON_STYLES[e.reason] || REASON_STYLES.sonstiges;

    // Gruppenchip nur bei "Alle"-Ansicht anzeigen
    const showGroupChip = groupId === "all";
    const entryGroup = showGroupChip ? getGroupById(groups, e.groupId) : null;
    const entryGroupStyles = showGroupChip ? getGroupStyles(entryGroup) : null;

    return (
      <div
        key={e.id}
        className={`p-4 rounded-2xl border shadow-sm ${
          faded
            ? "bg-stone-50 border-stone-200 opacity-70"
            : "bg-white border-stone-200"
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-1">
            <p className="font-bold text-sm text-stone-800">{e.childName}</p>

            <p className="text-xs text-stone-600 flex items-center gap-1">
              <CalendarDays size={12} className="text-stone-400" />
              {dateLabel(e)}
            </p>

            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reasonStyle}`}
            >
              {e.reason.charAt(0).toUpperCase() + e.reason.slice(1)}
            </span>

            {/* Hinweis der Eltern anzeigen */}
            {e.otherText && (
              <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg mt-1">
                <span className="font-medium">Hinweis:</span> {e.otherText}
              </p>
            )}

            <p className="text-[10px] text-stone-400 mt-1">
              Eingereicht am{" "}
              {new Date(e.createdAt).toLocaleString("de-DE")}
            </p>

            {/* Team-Antwort anzeigen wenn vorhanden */}
            {e.staffResponse && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[10px] font-semibold text-amber-800 mb-1">
                  Eure Antwort{e.responseAcknowledged ? " (gelesen)" : ""}:
                </p>
                <p className="text-xs text-amber-900">{e.staffResponse}</p>
                <p className="text-[10px] text-amber-600 mt-1">
                  {new Date(e.staffResponseAt).toLocaleString("de-DE")}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {/* Antworten-Button */}
              <button
                onClick={() => openResponseModal(e)}
                className={`p-2 rounded-lg ${
                  e.staffResponse
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
                title={e.staffResponse ? "Antwort bearbeiten" : "Antworten"}
              >
                <MessageSquare size={16} />
              </button>

              {e.status === "new" ? (
                <button
                  onClick={() => markRead(e.id)}
                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                >
                  <CheckCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={() => markUnread(e.id)}
                  className="p-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
                >
                  <Undo2 size={16} />
                </button>
              )}

              <button
                onClick={() => remove(e.id)}
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Gruppenchip bei "Alle"-Ansicht - rechts unten */}
            {showGroupChip && entryGroupStyles && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${entryGroupStyles.chipClass} text-white`}>
                <entryGroupStyles.Icon size={10} />
                {entryGroupStyles.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && groups.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ NUR DER HEADER (KEIN EXTRA „ABWESENHEITEN") */}
      <div
        className="p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-col gap-3"
        style={{ backgroundColor: groupId === "all" ? "#f8f9fa" : currentGroup?.headerColor }}
      >
        <div className="flex items-center gap-3">
          {groupId === "all" ? (
            <div className="bg-stone-400 p-2 rounded-2xl text-white shadow">
              <CalendarDays size={20} />
            </div>
          ) : (
            <div
              className={`${currentGroup?.chipClass} p-2 rounded-2xl text-white shadow`}
            >
              {currentGroup && <currentGroup.Icon size={20} />}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-stone-800">Meldungen</h2>
            <p className="text-xs text-stone-600">
              {groupId === "all"
                ? "Alle Abwesenheiten aller Gruppen"
                : `Abwesenheiten der Gruppe ${currentGroup?.name}`}
            </p>
          </div>
        </div>

        {/* ✅ CHIP-LEISTE MIT BADGES (MEHRZEILIG) */}
        <div className="mt-2 flex flex-wrap gap-2">
          {/* ALLE-Button */}
          <button
            onClick={() => setGroupId("all")}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition ${
              groupId === "all"
                ? "bg-stone-600 border-transparent text-white"
                : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
            }`}
          >
            <CalendarDays size={14} />
            <span>Alle</span>

            {totalUnreadCount > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold flex items-center justify-center text-stone-900">
                {totalUnreadCount}
              </span>
            )}
          </button>

          {groups.map((g) => {
            const styles = getGroupStyles(g);
            const active = g.id === groupId;
            const unread = unreadCountByGroup[g.id] || 0;

            return (
              <button
                key={g.id}
                onClick={() => setGroupId(g.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition ${
                  active
                    ? `${styles.chipClass} border-transparent text-white`
                    : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
                }`}
              >
                <styles.Icon size={14} />
                <span>{styles.name}</span>

                {unread > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold flex items-center justify-center text-stone-900">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex gap-3">
        <button
          className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
            activeTab === "new"
              ? "bg-amber-500 text-white border-transparent"
              : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100"
          }`}
          onClick={() => setActiveTab("new")}
        >
          Neu ({newEntries.length})
        </button>

        <button
          className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
            activeTab === "read"
              ? "bg-amber-500 text-white border-transparent"
              : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100"
          }`}
          onClick={() => setActiveTab("read")}
        >
          Gelesen ({readEntries.length})
        </button>
      </div>

      {/* INHALT */}
      {activeTab === "new" && (
        <div className="space-y-3">
          {newEntries.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-stone-500">
              Keine neuen Meldungen.
            </div>
          ) : (
            newEntries.map((e) => renderCard(e, false))
          )}
        </div>
      )}

      {activeTab === "read" && (
        <div className="space-y-3">
          {readEntries.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-stone-500">
              Keine gelesenen Meldungen.
            </div>
          ) : (
            readEntries.map((e) => renderCard(e, true))
          )}
        </div>
      )}

      {/* Antwort-Modal */}
      {respondingTo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full border border-stone-200 shadow-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-stone-800 text-lg">
                  Antwort an Eltern
                </h3>
                <p className="text-sm text-stone-500">
                  Für {respondingTo.childName}
                </p>
              </div>
              <button
                onClick={() => {
                  setRespondingTo(null);
                  setResponseText("");
                }}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl text-sm text-stone-600">
              <p className="font-medium text-stone-700 mb-1">Meldung:</p>
              <p>{dateLabel(respondingTo)} – {respondingTo.reason.charAt(0).toUpperCase() + respondingTo.reason.slice(1)}</p>
              {respondingTo.otherText && (
                <p className="mt-1 text-stone-500">Hinweis: {respondingTo.otherText}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                Eure Nachricht an die Eltern:
              </label>
              <textarea
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="z.B. Gute Besserung! Bitte informiert uns über den weiteren Verlauf..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setRespondingTo(null);
                  setResponseText("");
                }}
                className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold hover:bg-stone-300"
              >
                Abbrechen
              </button>
              <button
                onClick={sendResponse}
                disabled={!responseText.trim() || sendingResponse}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  responseText.trim() && !sendingResponse
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-stone-300 text-stone-500 cursor-not-allowed"
                }`}
              >
                {sendingResponse ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <MessageSquare size={16} />
                    Senden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}