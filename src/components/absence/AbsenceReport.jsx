// src/components/absence/AbsenceReport.jsx
import React, { useState, useEffect } from "react";
import { Trash2, Pencil } from "lucide-react";
import AbsenceBanner from "./AbsenceBanner";
import AbsenceEditor from "./AbsenceEditor";
import { GROUPS } from "../../lib/constants";
import { StorageService } from "../../lib/storage";

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

  const [activeChildId, setActiveChildId] = useState(
    children.length > 0 ? children[0].id : null
  );
  const [editing, setEditing] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    load();
  }, [activeChildId]);

  const load = () => {
    const all = StorageService.get("absences") || [];
    setEntries(all.filter((e) => e.childId === activeChildId));
  };

  const save = (entry) => {
    const all = StorageService.get("absences") || [];
    const idx = all.findIndex((e) => e.id === entry.id);

    if (idx === -1) all.push(entry);
    else all[idx] = entry;

    StorageService.set("absences", all);
    setEditing(null);
    load();
  };

  const remove = (id) => {
    if (!confirm("Meldung löschen?")) return;

    let all = StorageService.get("absences") || [];
    all = all.filter((e) => e.id !== id);
    StorageService.set("absences", all);
    load();
  };

  const child =
    children.find((c) => c.id === activeChildId) || children[0] || null;

  const dateLabel = (e) => {
    if (e.type === "single") return formatDate(e.dateFrom);
    return formatDateRange(e.dateFrom, e.dateTo);
  };

  if (!child) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 text-sm text-stone-600">
        Für dieses Profil sind aktuell keine Kinder hinterlegt.
      </div>
    );
  }

  const childGroup = GROUPS.find((g) => g.id === child.group);

  return (
    <div className="space-y-5">
      <AbsenceBanner />

      {/* CHIP-Auswahl der Kinder */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((c) => {
            const group = GROUPS.find((g) => g.id === c.group);
            const active = c.id === activeChildId;

            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveChildId(c.id);
                  setEditing(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? `${group?.color || "bg-amber-500"} border-transparent text-white`
                    : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
                }`}
              >
                {group?.icon}
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor */}
      {child && (
        <AbsenceEditor
          mode={editing ? "edit" : "create"}
          initialData={editing}
          child={child}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Liste */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 text-center text-stone-500 text-sm">
            Keine bisherigen Meldungen.
          </div>
        ) : (
          entries
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((e) => {
              const group = GROUPS.find((g) => g.id === e.groupId) || childGroup;
              const reasonMeta = getReasonMeta(e.reason);
              const submittedAt = new Date(e.createdAt).toLocaleString("de-DE");

              return (
                <div
                  key={e.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {e.childName || child.name}
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          {dateLabel(e)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reasonMeta.className}`}
                        >
                          {reasonMeta.label}
                        </span>
                        {e.reason === "sonstiges" && e.otherText && (
                          <span className="text-xs text-stone-600">
                            {e.otherText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {group && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${group.color}`}
                        >
                          {group.icon}
                          <span>{group.name}</span>
                        </span>
                      )}

                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditing(e)}
                          className="p-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
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

                  <p className="text-[10px] text-stone-400 mt-2">
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