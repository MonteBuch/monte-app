// src/components/news/News.jsx
import React, { useEffect, useMemo, useState } from "react";
import { StorageService } from "../../lib/storage";
import NewsCreate from "./NewsCreate";
import NewsFeed from "./NewsFeed";

export default function News({ user }) {
  const [allNews, setAllNews] = useState([]);

  const facility = StorageService.getFacilitySettings() || {};
  const groups = facility.groups || [];

  // pro Benutzer ausgeblendete News (Delete im Feed)
  const [hiddenNewsIds, setHiddenNewsIds] = useState(() => {
    return StorageService.get(`news_hidden_${user.username}`) || [];
  });

  // Gruppenfilter im Header / Editor
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    if (user.role === "team" && user.primaryGroup) {
      return user.primaryGroup;
    }
    // Admin & alle anderen starten auf "Alle"
    return "all";
  });

  // News laden & leicht migrieren
  useEffect(() => {
    const loaded = StorageService.get("news") || [];

    const migrated = loaded.map((n) => {
      let groupId = n.groupId;
      if (!groupId && n.group) groupId = n.group;

      let target = n.target;
      if (!target) target = groupId ? "group" : "all";

      return {
        ...n,
        groupId: groupId || null,
        target,
      };
    });

    migrated.sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });

    setAllNews(migrated);

    if (JSON.stringify(loaded) !== JSON.stringify(migrated)) {
      StorageService.set("news", migrated);
    }
  }, []);

  const handleAddNews = (item) => {
    const updated = [item, ...allNews];
    setAllNews(updated);
    StorageService.set("news", updated);
  };

  const handleGroupChange = (id) => {
    setSelectedGroupId(id || "all");
  };

  const handleHideNews = (id) => {
    const updated = [...hiddenNewsIds, id];
    setHiddenNewsIds(updated);
    StorageService.set(`news_hidden_${user.username}`, updated);
  };

  // Basis-Sichtbarkeit nach Rolle
  const visibleByRole = useMemo(() => {
    if (!allNews.length) return [];

    // Eltern: globale News + News der Kindergruppen
    if (user.role === "parent") {
      const childGroups = Array.from(
        new Set((user.children || []).map((c) => c.group).filter(Boolean))
      );
      return allNews.filter((n) => {
        if (!n.groupId) return true; // an alle
        if (!childGroups.length) return false;
        return childGroups.includes(n.groupId);
      });
    }

    // Admin UND Team sehen alles (Option A)
    return allNews;
  }, [allNews, user]);

  // nach Hidden-Liste und Gruppenfilter einschränken
  const filteredNews = useMemo(() => {
    const base = visibleByRole.filter((n) => !hiddenNewsIds.includes(n.id));

    if (selectedGroupId === "all" || user.role === "parent") {
      return base;
    }
    return base.filter((n) => n.groupId === selectedGroupId);
  }, [visibleByRole, hiddenNewsIds, selectedGroupId, user.role]);

  return (
    <div className="space-y-6">
      {/* Info-Karte nur für Eltern */}
      {user.role === "parent" && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-lg font-bold text-stone-800">News</h2>
          <p className="text-xs text-stone-500 mt-1">
            Wichtige Infos aus dem Kinderhaus – Mitteilungen der Gruppen und der
            Einrichtung.
          </p>
        </div>
      )}

      {/* Editor + Header nur für Team/Admin */}
      {(user.role === "team" || user.role === "admin") && (
        <NewsCreate
          user={user}
          groups={groups}
          selectedGroupId={selectedGroupId}
          onGroupChange={handleGroupChange}
          onSubmit={handleAddNews}
        />
      )}

      {/* News-Feed für alle Rollen */}
      <NewsFeed
        user={user}
        news={filteredNews}
        groups={groups}
        onDelete={handleHideNews}
      />
    </div>
  );
}