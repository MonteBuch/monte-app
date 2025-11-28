// src/components/absence/AdminAbsenceDashboard.jsx
import React, { useEffect, useState } from "react";
import { GROUPS } from "../../lib/constants";
import { StorageService } from "../../lib/storage";
import { CheckCircle, Undo2, Trash2 } from "lucide-react";

export default function AdminAbsenceDashboard({ user }) {
  const [groupId, setGroupId] = useState(user.primaryGroup || "erde");
  const [activeTab, setActiveTab] = useState("new"); // new | read
  const [entries, setEntries] = useState([]);

  const load = () => {
    const all = StorageService.get("absences") || [];

    // Nur Meldungen der aktiven Gruppe
    const filtered = all.filter((e) => e.groupId === groupId);

    // Automatische Bereinigung älterer Meldungen
    const cleaned = filtered.filter((e) => {
      if (e.status !== "read") return true;
      const end = e.type === "range" ? e.dateTo : e.dateFrom;
      return new Date(end) >= new Date();
    });

    // Falls Bereinigung etwas gelöscht hat → speichern
    if (cleaned.length !== filtered.length) {
      const rest = all.filter((e) => e.groupId !== groupId);
      StorageService.set("absences", [...rest, ...cleaned]);
    }

    setEntries(cleaned);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const markRead = (id) => {
    const all = StorageService.get("absences") || [];
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;

    all[idx].status = "read";
    StorageService.set("absences", all);
    load();
  };

  const markUnread = (id) => {
    const all = StorageService.get("absences") || [];
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;

    all[idx].status = "new";
    StorageService.set("absences", all);
    load();
  };

  const remove = (id) => {
    if (!confirm("Meldung löschen?")) return;

    const all = StorageService.get("absences") || [];
    const filtered = all.filter((e) => e.id !== id);
    StorageService.set("absences", filtered);
    load();
  };

  const newEntries = entries
    .filter((e) => e.status === "new")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const readEntries = entries
    .filter((e) => e.status === "read")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const currentGroup = GROUPS.find((g) => g.id === groupId);

  const dateLabel = (e) => {
    if (e.type === "single") return e.dateFrom;
    return `${e.dateFrom} – ${e.dateTo}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className={`p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3 ${currentGroup.light}`}>
        <div className="flex items-center gap-3">
          <div className={`${currentGroup.color} p-2 rounded-2xl text-white shadow`}>
            {currentGroup.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800">Meldungen</h2>
            <p className="text-xs text-stone-600">
              Abwesenheiten der Gruppe {currentGroup.name}
            </p>
          </div>
        </div>

        {/* GROUP CHIPS */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition ${
                g.id === groupId
                  ? `${g.color} border-transparent`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              {g.icon}
              <span>{g.name}</span>
            </button>
          ))}
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

      {/* LISTE: NEU */}
      {activeTab === "new" && (
        <div className="space-y-3">
          {newEntries.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-stone-500">
              Keine neuen Meldungen.
            </div>
          ) : (
            newEntries.map((e) => (
              <div
                key={e.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-amber-200"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-sm text-stone-800">
                      {e.childName}
                    </p>

                    <p className="text-xs text-stone-600 mt-1">
                      {dateLabel(e)} ·{" "}
                      {e.reason === "sonstiges"
                        ? e.otherText || "Sonstiges"
                        : e.reason.charAt(0).toUpperCase() + e.reason.slice(1)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* ALS GELESEN */}
                    <button
                      onClick={() => markRead(e.id)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                    >
                      <CheckCircle size={16} />
                    </button>

                    {/* LÖSCHEN */}
                    <button
                      onClick={() => remove(e.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-stone-400 mt-2">
                  Eingereicht am{" "}
                  {new Date(e.createdAt).toLocaleString("de-DE")}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* LISTE: GELESEN */}
      {activeTab === "read" && (
        <div className="space-y-3">
          {readEntries.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-stone-500">
              Keine gelesenen Meldungen.
            </div>
          ) : (
            readEntries.map((e) => (
              <div
                key={e.id}
                className="bg-stone-50 p-4 rounded-xl border border-stone-200 opacity-70"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-sm text-stone-700">
                      {e.childName}
                    </p>

                    <p className="text-xs text-stone-600 mt-1">
                      {dateLabel(e)} ·{" "}
                      {e.reason === "sonstiges"
                        ? e.otherText || "Sonstiges"
                        : e.reason.charAt(0).toUpperCase() + e.reason.slice(1)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* ALS UNGELESEN */}
                    <button
                      onClick={() => markUnread(e.id)}
                      className="p-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
                    >
                      <Undo2 size={16} />
                    </button>

                    {/* LÖSCHEN */}
                    <button
                      onClick={() => remove(e.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-stone-400 mt-2">
                  Eingereicht am{" "}
                  {new Date(e.createdAt).toLocaleString("de-DE")}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}