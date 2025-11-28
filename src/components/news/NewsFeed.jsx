// src/components/news/NewsFeed.jsx
import React from "react";
import { Calendar } from "lucide-react";

export default function NewsFeed({ user, news, groups }) {
  const safeNews = Array.isArray(news) ? news : [];
  const safeGroups = Array.isArray(groups) ? groups : [];

  const getGroupName = (id) => {
    if (!id) return null;
    const g = safeGroups.find((x) => x.id === id);
    return g ? g.name : null;
  };

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
        const groupName = getGroupName(n.groupId);

        return (
          <div
            key={n.id}
            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm"
          >
            {groupName && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 inline-block mb-1">
                {groupName}
              </span>
            )}

            <p className="text-sm text-stone-800 leading-snug mb-3">{n.text}</p>

            <div className="flex items-center text-xs text-stone-500 gap-1">
              <Calendar size={14} />
              {formatDate(n.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
}