// src/components/news/News.jsx
import React, { useEffect, useMemo, useState } from "react";
import { StorageService } from "../../lib/storage";
import NewsCreate from "./NewsCreate";
import NewsFeed from "./NewsFeed";

export default function News({ user }) {
  const [allNews, setAllNews] = useState([]);

  const facility = StorageService.getFacilitySettings() || {};
  const groups = facility.groups || [];

  // News laden + Alt-Daten migrieren
  useEffect(() => {
    const loaded = StorageService.get("news") || [];

    const migrated = loaded.map((n) => {
      let groupId = n.groupId;
      if (!groupId && n.group) {
        groupId = n.group;
      }

      let target = n.target;
      if (!target) {
        target = groupId ? "group" : "all";
      }

      return {
        ...n,
        groupId: groupId || null,
        target,
      };
    });

    // Optional: nach Datum sortieren (neueste zuerst)
    migrated.sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });

    setAllNews(migrated);

    // falls Migration wirklich etwas geändert hat → zurückschreiben
    if (JSON.stringify(loaded) !== JSON.stringify(migrated)) {
      StorageService.set("news", migrated);
    }
  }, []);

  const handleAddNews = (item) => {
    const updated = [item, ...allNews];
    setAllNews(updated);
    StorageService.set("news", updated);
  };

  const visibleNews = useMemo(() => {
    if (!allNews || allNews.length === 0) return [];

    // Admin sieht alles
    if (user.role === "admin") return allNews;

    // Team: "alle" + eigene Stammgruppe
    if (user.role === "team") {
      const pg = user.primaryGroup;
      return allNews.filter((n) => {
        if (n.target === "all" || (!n.target && !n.groupId)) return true;
        if (!pg || !n.groupId) return false;
        return n.groupId === pg;
      });
    }

    // Eltern: "alle" + Gruppen der Kinder
    if (user.role === "parent") {
      const childGroups = Array.from(
        new Set((user.children || []).map((c) => c.group).filter(Boolean))
      );
      return allNews.filter((n) => {
        if (n.target === "all" || (!n.target && !n.groupId)) return true;
        if (!n.groupId || childGroups.length === 0) return false;
        return childGroups.includes(n.groupId);
      });
    }

    // Fallback: alles
    return allNews;
  }, [allNews, user]);

  return (
    <div className="space-y-6">
      {/* Header-Karte */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800">News</h2>
        <p className="text-xs text-stone-500 mt-1">
          Wichtige Infos aus dem Kinderhaus – Mitteilungen der Gruppen und der
          Einrichtung.
        </p>
      </div>

      {/* Editor nur für Team & Leitung */}
      {(user.role === "team" || user.role === "admin") && (
        <NewsCreate user={user} groups={groups} onSubmit={handleAddNews} />
      )}

      {/* Feed */}
      <NewsFeed user={user} news={visibleNews} groups={groups} />
    </div>
  );
}