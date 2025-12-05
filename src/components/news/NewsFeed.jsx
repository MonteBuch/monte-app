// src/components/news/NewsFeed.jsx
import React from "react";
import { Calendar, Megaphone } from "lucide-react";

/**
 * NewsFeed – zeigt die Mitteilungen mit gruppenspezifischen Chips an.
 * - Jede Karte hat einen gelben Rahmen zur Harmonisierung mit dem Meldungen‑Tab.
 */
export default function NewsFeed({ user, news, groups }) {
  const safeNews = Array.isArray(news) ? news : [];
  const safeGroups = Array.isArray(groups) ? groups : [];

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (safeNews.length === 0) {
    return (
      <p className="text-xs text-stone-500 text-center py-6">
        Keine Mitteilungen vorhanden.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {safeNews.map((n) => {
        const group =
          n.groupId && Array.isArray(safeGroups)
            ? safeGroups.find((g) => g.id === n.groupId)
            : null;

        return (
          <div
            key={n.id}
            className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3"
          >
            {/* Kopfzeile: News‑Icon links, Gruppen‑Chip & Datum rechts */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="bg-stone-100 text-stone-700 rounded-full p-2">
                  <Megaphone size={16} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {group ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${group.color}`}
                  >
                    {group.icon}
                    <span>{group.name}</span>
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                    Alle
                  </span>
                )}
                <div className="flex items-center gap-1 text-[10px] text-stone-500">
                  <Calendar size={12} />
                  {formatDate(n.date)}
                </div>
              </div>
            </div>
            {/* Nachrichtentext */}
            <p className="text-sm text-stone-800 leading-snug">{n.text}</p>
          </div>
        );
      })}
    </div>
  );
}