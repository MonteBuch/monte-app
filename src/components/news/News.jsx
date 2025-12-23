// src/components/news/News.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Home } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { useGroups } from "../../context/GroupsContext";
import { sendNewsEmailNotifications } from "../../api/emailApi";
import { sendNewsPushNotifications } from "../../api/pushApi";
import { SkeletonList } from "../ui/LoadingSpinner";
import { useToast } from "../ui/Toast";

import NewsCreate from "./NewsCreate";
import NewsFeed from "./NewsFeed";

const NEWS_BUCKET = "news-attachments";

export default function News({ user }) {
  const [allNews, setAllNews] = useState([]);
  // Gruppen aus zentralem Context (bereits geladen, mit Realtime)
  const { groups } = useGroups();
  // Multi-Select: Array von Gruppen-IDs (leer = alle)
  const [selectedGroupIds, setSelectedGroupIds] = useState(() => {
    if (user.role === "team" && user.primaryGroup) return [user.primaryGroup];
    return []; // leer = alle
  });
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useToast();

  // Hilfsfunktion: News-Daten mappen
  const mapNewsRow = (row) => ({
    id: row.id,
    title: row.title || null,
    text: row.text,
    date: row.date,
    groupId: row.group_id || null,
    groupIds: Array.isArray(row.group_ids) ? row.group_ids : [],
    target: row.target || (row.group_id ? "group" : "all"),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdBy: row.created_by,
  });

  // News aus Supabase laden
  const loadNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der News:", error);
        showError("News konnten nicht geladen werden");
        setAllNews([]);
      } else {
        setAllNews((data || []).map(mapNewsRow));
      }
    } catch (e) {
      console.error("Unerwarteter Fehler beim Laden der News:", e);
      setAllNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();

    // Realtime Subscription für News-Änderungen
    const channel = supabase
      .channel("news-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news",
        },
        (payload) => {
          console.log("News Realtime: INSERT");
          const newItem = mapNewsRow(payload.new);
          setAllNews((prev) => [newItem, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "news",
        },
        (payload) => {
          console.log("News Realtime: UPDATE");
          setAllNews((prev) =>
            prev.map((n) => (n.id === payload.new.id ? mapNewsRow(payload.new) : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "news",
        },
        (payload) => {
          console.log("News Realtime: DELETE");
          setAllNews((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Attachments in Supabase Storage hochladen und Metadaten zurückgeben
  const uploadAttachments = async (newsId, attachments) => {
    if (!attachments || !attachments.length) return [];

    const uploaded = [];

    for (const att of attachments) {
      // att.file kommt aus NewsCreate
      if (!att.file) continue;

      const path = `${user.id}/${newsId}/${att.name}`;

      const { error: uploadError } = await supabase.storage
        .from(NEWS_BUCKET)
        .upload(path, att.file, {
          upsert: true,
        });

      if (uploadError) {
        console.error("Fehler beim Upload eines Anhangs:", uploadError);
        continue;
      }

      const { data: publicData } = supabase.storage
        .from(NEWS_BUCKET)
        .getPublicUrl(path);

      const url = publicData?.publicUrl;
      if (!url) continue;

      uploaded.push({
        name: att.name,
        size: att.size,
        type: att.type,
        url,
      });
    }

    return uploaded;
  };

  // News anlegen: Attachments hochladen → Row in „news" schreiben → State updaten
  const handleAddNews = async (draft) => {
    try {
      const newsId = draft.id || crypto.randomUUID();
      const uploadedAttachments = await uploadAttachments(newsId, draft.attachments || []);

      // Multi-Gruppen Unterstützung
      const groupIds = draft.groupIds || [];
      const isAllGroups = groupIds.length === 0;

      const payload = {
        id: newsId,
        title: draft.title || null,
        text: draft.text,
        date: draft.date,
        group_id: draft.groupId || null, // Legacy: erste Gruppe oder null
        group_ids: groupIds, // Neu: Array aller Gruppen
        target: draft.target || (isAllGroups ? "all" : "group"),
        attachments: uploadedAttachments,
        created_by: draft.createdBy || user.id,
        facility_id: null,
      };

      const { data, error } = await supabase
        .from("news")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("Fehler beim Speichern der News:", error);
        showError("News konnte nicht gespeichert werden");
        return;
      }

      const mapped = {
        id: data.id,
        title: data.title || null,
        text: data.text,
        date: data.date,
        groupId: data.group_id || null,
        groupIds: Array.isArray(data.group_ids) ? data.group_ids : [],
        target: data.target || (data.group_id ? "group" : "all"),
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        createdBy: data.created_by,
      };

      setAllNews((prev) => [mapped, ...prev]);

      // Email-Benachrichtigungen senden (mit Multi-Gruppen Support)
      const targetGroupIds = mapped.groupIds.length > 0 ? mapped.groupIds : null;
      const targetGroupNames = targetGroupIds
        ? targetGroupIds.map(gid => groups.find(g => g.id === gid)?.name).filter(Boolean)
        : null;

      // Email und Push parallel senden
      const [emailResult, pushResult] = await Promise.all([
        sendNewsEmailNotifications(
          mapped,
          targetGroupIds,
          targetGroupNames,
          user.name || null
        ),
        sendNewsPushNotifications(mapped, targetGroupIds)
      ]);

      // Erfolgs-Nachricht mit Statistiken
      const notifications = [];
      if (emailResult.sentCount > 0) {
        notifications.push(`${emailResult.sentCount} Email(s)`);
      }
      if (pushResult.sentCount > 0) {
        notifications.push(`${pushResult.sentCount} Push`);
      }

      if (notifications.length > 0) {
        showSuccess(`News veröffentlicht und ${notifications.join(' + ')} gesendet`);
      } else {
        showSuccess("News erfolgreich veröffentlicht");
      }
    } catch (e) {
      console.error("Unerwarteter Fehler beim Anlegen der News:", e);
      showError("News konnte nicht erstellt werden");
    }
  };

  const handleGroupsChange = (ids) => setSelectedGroupIds(ids || []);

  // News wirklich aus der Datenbank löschen (nur Team/Admin)
  const handleDeleteNews = async (id) => {
    if (user.role !== "team" && user.role !== "admin") {
      showError("Keine Berechtigung zum Löschen");
      return;
    }

    try {
      // Erst Attachments aus Storage löschen
      const newsToDelete = allNews.find(n => n.id === id);
      if (newsToDelete?.attachments?.length > 0) {
        for (const att of newsToDelete.attachments) {
          if (att.url) {
            // URL parsen um Storage-Pfad zu bekommen
            const urlParts = att.url.split("/news-attachments/");
            if (urlParts[1]) {
              await supabase.storage
                .from("news-attachments")
                .remove([urlParts[1]]);
            }
          }
        }
      }

      // News aus DB löschen
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Fehler beim Löschen der News:", error);
        showError("News konnte nicht gelöscht werden");
        return;
      }

      // Aus lokalem State entfernen
      setAllNews((prev) => prev.filter((n) => n.id !== id));
      showSuccess("News gelöscht");
    } catch (e) {
      console.error("Unerwarteter Fehler beim Löschen der News:", e);
      showError("Fehler beim Löschen");
    }
  };

  // Sichtweite nach Rolle (Eltern nur eigene Gruppen)
  const visibleByRole = useMemo(() => {
    if (!allNews.length) return [];

    if (user.role === "parent") {
      const childGroups = Array.from(
        new Set((user.children || []).map((c) => c.group).filter(Boolean))
      );
      return allNews.filter((n) => {
        // Globale News (keine Gruppen) → für alle sichtbar
        if (!n.groupId && (!n.groupIds || n.groupIds.length === 0)) return true;
        if (!childGroups.length) return false;
        // Multi-Gruppen: prüfen ob mindestens eine übereinstimmt
        if (n.groupIds && n.groupIds.length > 0) {
          return n.groupIds.some(gid => childGroups.includes(gid));
        }
        // Legacy: einzelne groupId
        return childGroups.includes(n.groupId);
      });
    }

    // Team/Admin sehen alles
    return allNews;
  }, [allNews, user]);

  // Filter nach Gruppe (für Team/Admin)
  const filteredNews = useMemo(() => {
    // Eltern oder keine Filterung → alle anzeigen
    if (user.role === "parent" || selectedGroupIds.length === 0) {
      return visibleByRole;
    }

    // Team/Admin mit Gruppenfilter: News mit mindestens einer übereinstimmenden Gruppe
    return visibleByRole.filter((n) => {
      if (n.groupIds && n.groupIds.length > 0) {
        return n.groupIds.some(gid => selectedGroupIds.includes(gid));
      }
      return selectedGroupIds.includes(n.groupId);
    });
  }, [visibleByRole, selectedGroupIds, user.role]);

  return (
    <div className="space-y-6">
      {/* === HEADER (PARENT VIEW) - Pinnwand === */}
      {user.role === "parent" && (
        <div
          className="p-5 rounded-3xl shadow-sm border border-stone-200"
          style={{ backgroundColor: "#f8f9fa" }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-2xl text-white shadow">
              <Home size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800">Pinnwand</h2>
              <p className="text-xs text-stone-600">
                Neuigkeiten aus dem Kinderhaus
              </p>
            </div>
          </div>
        </div>
      )}
      {/* === END HEADER (PARENT VIEW) === */}

      {(user.role === "team" || user.role === "admin") && (
        <NewsCreate
          user={user}
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          onGroupsChange={handleGroupsChange}
          onSubmit={handleAddNews}
        />
      )}

      <NewsFeed
        user={user}
        news={filteredNews}
        groups={groups}
        onDelete={(user.role === "team" || user.role === "admin") ? handleDeleteNews : null}
      />

      {loading && <SkeletonList count={3} />}
    </div>
  );
}