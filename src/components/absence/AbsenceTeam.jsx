// src/components/absence/AbsenceTeam.jsx
import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, CalendarDays } from "lucide-react";
import { StorageService } from "../../lib/storage";
import { GROUPS } from "../../lib/constants";

const STATUS_KEY = "absence_status";

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
  const sameMonth =
    sameYear && fromDate.getMonth() === toDate.getMonth();

  const fromLabel = fromDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: sameMonth ? undefined : "numeric",
  });

  const toLabel = toDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${fromLabel} – ${toLabel}`;
}

function formatReason(reason) {
  switch (reason) {
    case "krankheit":
      return { label: "Krankheit", className: "bg-amber-100 text-amber-900" };
    case "urlaub":
      return { label: "Urlaub", className: "bg-emerald-100 text-emerald-900" };
    case "termin":
      return { label: "Termin", className: "bg-sky-100 text-sky-900" };
    case "sonstiges":
      return { label: "Sonstiges", className: "bg-stone-200 text-stone-800" };
    default:
      return { label: reason, className: "bg-stone-100 text-stone-800" };
  }
}

// Hilfsfunktion: Status-Struktur aus Storage holen
function loadStatusForUser(username) {
  const raw = StorageService.get(STATUS_KEY); // kann Array ODER Objekt sein
  const allStatus = raw && !Array.isArray(raw) ? raw : {};
  const userStatus = allStatus[username] || {};
  return { allStatus, userStatus };
}

function saveStatusForUser(username, userStatus) {
  const raw = StorageService.get(STATUS_KEY);
  const allStatus = raw && !Array.isArray(raw) ? raw : {};
  allStatus[username] = userStatus;
  StorageService.set(STATUS_KEY, allStatus);
}

export default function AbsenceTeam({ user }) {
  const [allEntries, setAllEntries] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const isAdmin = user.role === "admin";
  const isTeam = user.role === "team";

  const [selectedGroup, setSelectedGroup] = useState(
    isAdmin ? "all" : user.primaryGroup || "all"
  );

  // Initial-Load: Meldungen + Status + Auto-Löschung alter gelesener Meldungen
  useEffect(() => {
    const absences = StorageService.get("absences") || [];
    const todayIso = new Date().toISOString().slice(0, 10);

    const { allStatus, userStatus } = loadStatusForUser(user.username);
    let changed = false;

    // Sicherstellen, dass es für jede Meldung einen Status gibt
    absences.forEach((e) => {
      const meta = userStatus[e.id] || { status: "new", deleted: false };

      // Auto-Löschung: Nur für diesen Erzieher, nur wenn gelesen & abgelaufen
      if (!meta.deleted && meta.status === "read") {
        const endIso =
          e.type === "range"
            ? (e.dateTo || e.dateFrom)
            : e.dateFrom;

        if (endIso && endIso < todayIso) {
          meta.deleted = true;
          changed = true;
        }
      }

      userStatus[e.id] = meta;
    });

    if (changed) {
      saveStatusForUser(user.username, userStatus);
    }

    setAllEntries(absences);
    setStatusMap(userStatus);
  }, [user.username]);

  // Wenn Rolle / Stammgruppe sich ändert → Vorauswahl aktualisieren
  useEffect(() => {
    setSelectedGroup(isAdmin ? "all" : user.primaryGroup || "all");
  }, [isAdmin, user.primaryGroup]);

  const effectiveStatus = (entry) => {
    const meta = statusMap[entry.id];
    return meta?.status || "new";
  };

  const isDeletedForUser = (entry) => {
    const meta = statusMap[entry.id];
    return meta?.deleted === true;
  };

  const dateLabel = (e) => {
    return e.type === "single"
      ? formatDate(e.dateFrom)
      : formatDateRange(e.dateFrom, e.dateTo);
  };

  // Status ändern (nur für diesen Nutzer)
  const setStatus = (entry, newStatus) => {
    const { userStatus } = loadStatusForUser(user.username);
    const meta = userStatus[entry.id] || { status: "new", deleted: false };
    meta.status = newStatus;
    userStatus[entry.id] = meta;
    saveStatusForUser(user.username, userStatus);
    setStatusMap(userStatus);
  };

  // Löschen (nur für diesen Nutzer, nicht global)
  const removeForUser = (entry) => {
    if (!confirm("Meldung für dieses Profil ausblenden?")) return;

    const { userStatus } = loadStatusForUser(user.username);
    const meta = userStatus[entry.id] || { status: "new", deleted: false };
    meta.deleted = true;
    userStatus[entry.id] = meta;
    saveStatusForUser(user.username, userStatus);
    setStatusMap(userStatus);
  };

  // Gefilterte, sichtbare Meldungen (ohne gelöschte)
  const visibleEntries = allEntries
    .filter((e) => !isDeletedForUser(e))
    .filter((e) => {
      if (selectedGroup === "all") return true;
      return e.groupId === selectedGroup;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const newEntries = visibleEntries.filter(
    (e) => effectiveStatus(e) === "new"
  );
  const readEntries = visibleEntries.filter(
    (e) => effectiveStatus(e) === "read"
  );

  // Unread-Badges pro Gruppe berechnen
  const unreadCountByGroup = allEntries.reduce((acc, e) => {
    if (isDeletedForUser(e)) return acc;
    const status = effectiveStatus(e);
    if (status !== "new") return acc;
    const gid = e.groupId || "unknown";
    acc[gid] = (acc[gid] || 0) + 1;
    return acc;
  }, {});

  const totalUnread = Object.values(unreadCountByGroup).reduce(
    (sum, n) => sum + n,
    0
  );

  const renderEntryCard = (entry, faded) => {
    const g = GROUPS.find((x) => x.id === entry.groupId);
    const reason = formatReason(entry.reason);

    return (
      <div
        key={entry.id}
        className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
          faded
            ? "bg-stone-50 text-stone-500"
            : "bg-white text-stone-800"
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">
              {entry.childName}
            </p>

            <p className="text-xs text-stone-600 flex items-center gap-1">
              <CalendarDays size={12} className="text-stone-400" />
              <span>{dateLabel(entry)}</span>
            </p>

            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reason.className}`}
            >
              {reason.label}
            </span>

            {entry.reason === "sonstiges" && entry.otherText && (
              <p className="text-xs text-stone-600">
                {entry.otherText}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {g && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${g.color}`}
              >
                {g.icon}
                <span>{g.name}</span>
              </span>
            )}

            <div className="flex gap-1 mt-1">
              {effectiveStatus(entry) === "new" ? (
                <button
                  onClick={() => setStatus(entry, "read")}
                  className="p-2 bg-stone-100 rounded-lg hover:bg-stone-200"
                  title="Als gelesen markieren"
                >
                  <Eye size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setStatus(entry, "new")}
                  className="p-2 bg-stone-100 rounded-lg hover:bg-stone-200"
                  title="Als ungelesen markieren"
                >
                  <EyeOff size={14} />
                </button>
              )}

              <button
                onClick={() => removeForUser(entry)}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                title="Für dieses Profil löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-stone-400">
          Eingereicht am{" "}
          {new Date(entry.createdAt).toLocaleString("de-DE")}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Gruppenauswahl wie News: Chips + 'Alle' vorn */}
      <div className="flex flex-wrap gap-2">
        {/* Alle-Gruppen Button */}
        <button
          type="button"
          onClick={() => setSelectedGroup("all")}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition flex items-center gap-1 ${
            selectedGroup === "all"
              ? "bg-stone-800 text-white border-stone-900"
              : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
          }`}
        >
          <span>Alle</span>
          {totalUnread > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] text-stone-900">
              {totalUnread}
            </span>
          )}
        </button>

        {/* Gruppen-Auswahl mit Badge für neue Meldungen */}
        {GROUPS.map((g) => {
          const unread = unreadCountByGroup[g.id] || 0;
          const active = selectedGroup === g.id;

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGroup(g.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition ${
                active
                  ? `${g.color} border-transparent text-white`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              {g.icon}
              <span>{g.name}</span>
              {unread > 0 && (
                <span
                  className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] ${
                    active ? "bg-white/90 text-stone-900" : "bg-amber-400 text-stone-900"
                  }`}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Neue Meldungen */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Neue Meldungen
        </h2>

        {newEntries.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
            Keine neuen Meldungen.
          </div>
        ) : (
          newEntries.map((e) => renderEntryCard(e, false))
        )}
      </section>

      {/* Gelesene Meldungen */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Gelesene Meldungen
        </h2>

        {readEntries.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
            Keine gelesenen Meldungen.
          </div>
        ) : (
          readEntries.map((e) => renderEntryCard(e, true))
        )}
      </section>
    </div>
  );
}