// src/components/news/NewsFeed.jsx
import React from "react";
import { Calendar, Megaphone, Trash2 } from "lucide-react";

export default function NewsFeed({ user, news, groups, onDelete }) {
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

  const renderContent = (text) => {
    if (!text) return null;
    const trimmed = text.trim();

    // neue HTML-basierte News
    if (trimmed.startsWith("<")) {
      return (
        <div
          className="prose prose-sm max-w-none text-stone-800"
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      );
    }

    // Fallback für alte Plaintext-Einträge
    return (
      <p className="text-sm text-stone-800 leading-snug whitespace-pre-wrap">
        {trimmed}
      </p>
    );
  };

  if (!safeNews.length) {
    return (
      <p className="text-xs text-stone-500 text-center py-6">
        Keine Mitteilungen vorhanden.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {safeNews.map((n) => {
        const group = n.groupId
          ? safeGroups.find((g) => g.id === n.groupId)
          : null;

        return (
          <div
            key={n.id}
            className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3"
          >
            {/* Kopfzeile */}
            <div className="flex justify-between items-start">
              <div className="bg-stone-100 text-stone-700 rounded-full p-2">
                <Megaphone size={16} />
              </div>

              <div className="flex flex-col items-end gap-1">
                {group ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${group.color}`}
                  >
                    <span>{group.name}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                    Alle
                  </span>
                )}

                <div className="flex items-center gap-1 text-[10px] text-stone-500">
                  <Calendar size={12} />
                  {formatDate(n.date)}
                </div>
              </div>
            </div>

            {/* Inhalt */}
            {renderContent(n.text)}

            {/* Attachments */}
            {n.attachments && n.attachments.length > 0 && (
              <div className="space-y-1">
                {n.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.data}
                    download={att.name}
                    className="text-xs text-blue-600 underline"
                  >
                    📎 {att.name}
                  </a>
                ))}
              </div>
            )}

            {/* Löschen-Button (profilbezogen) */}
            {onDelete && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onDelete(n.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  title="Nur aus dieser Ansicht ausblenden"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}