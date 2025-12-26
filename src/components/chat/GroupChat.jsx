// src/components/chat/GroupChat.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  MessageCircle,
  Settings,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupStyles } from "../../utils/groupUtils";
import { useToast } from "../ui/Toast";
import ChatRoom from "./ChatRoom";

export default function GroupChat({ user }) {
  const [groups, setGroups] = useState([]);
  const [participation, setParticipation] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const { showSuccess, showError } = useToast();

  // Gruppen des Users (basierend auf Kindern) laden
  const loadData = useCallback(async () => {
    try {
      // Gruppen-IDs der Kinder des Users
      const childGroupIds = (user.children || [])
        .map((c) => c.group)
        .filter(Boolean);

      if (childGroupIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Gruppen laden
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .eq("is_event_group", false)
        .in("id", childGroupIds)
        .order("position");

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Teilnahme-Status laden
      const { data: participationData, error: partError } = await supabase
        .from("group_chat_participants")
        .select("*")
        .eq("user_id", user.id);

      if (partError) throw partError;

      const partMap = {};
      (participationData || []).forEach((p) => {
        partMap[p.group_id] = p;
      });
      setParticipation(partMap);

      // Ungelesene Nachrichten zählen für aktive Teilnahmen
      const activeGroupIds = (participationData || [])
        .filter((p) => p.is_active)
        .map((p) => p.group_id);

      if (activeGroupIds.length > 0) {
        const counts = {};
        for (const groupId of activeGroupIds) {
          const part = partMap[groupId];
          if (part) {
            const { count, error: countError } = await supabase
              .from("group_chat_messages")
              .select("id", { count: "exact", head: true })
              .eq("group_id", groupId)
              .neq("user_id", user.id) // Eigene Nachrichten nicht zählen
              .gt("created_at", part.last_read_at || part.activated_at);

            if (!countError) {
              counts[groupId] = count || 0;
            }
          }
        }
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error("Chat-Daten laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Chat aktivieren/deaktivieren
  const toggleChatParticipation = async (groupId, activate) => {
    try {
      const existing = participation[groupId];

      if (existing) {
        // Update existing participation
        const { error } = await supabase
          .from("group_chat_participants")
          .update({
            is_active: activate,
            activated_at: activate ? new Date().toISOString() : existing.activated_at,
            deactivated_at: activate ? null : new Date().toISOString(),
            last_read_at: activate ? new Date().toISOString() : existing.last_read_at,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else if (activate) {
        // Create new participation
        const { error } = await supabase.from("group_chat_participants").insert({
          user_id: user.id,
          group_id: groupId,
          is_active: true,
          activated_at: new Date().toISOString(),
          last_read_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      showSuccess(activate ? "Chat aktiviert" : "Chat deaktiviert");
      loadData();
    } catch (err) {
      console.error("Chat-Teilnahme ändern fehlgeschlagen:", err);
      showError("Aktion fehlgeschlagen");
    }
  };

  // Chat öffnen
  const openChat = (group) => {
    const part = participation[group.id];
    if (part?.is_active) {
      setSelectedGroup(group);
    }
  };

  // Aus Chat zurückkehren
  const closeChat = () => {
    setSelectedGroup(null);
    loadData(); // Refresh unread counts
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  // Chat-Raum anzeigen wenn Gruppe ausgewählt
  if (selectedGroup) {
    return (
      <ChatRoom
        group={selectedGroup}
        user={user}
        participation={participation[selectedGroup.id]}
        onBack={closeChat}
      />
    );
  }

  // Keine Gruppen
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle size={48} className="text-stone-300 dark:text-stone-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Kein Gruppenchat verfügbar</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Der Gruppenchat ist für Eltern mit Kindern in einer Gruppe verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <MessageCircle size={20} className="text-amber-500" />
            Gruppenchat
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Tausche dich mit anderen Eltern aus
          </p>
        </div>
        <button
          onClick={() => setSettingsModal(true)}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
          title="Chat-Einstellungen"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Info-Box */}
      <div className="bg-amber-50 dark:bg-amber-900/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-700">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">Hinweis zum Gruppenchat</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Der Chat ist nur für Eltern sichtbar. Team und Leitung haben keinen Zugriff.
              Du kannst den Chat jederzeit aktivieren oder deaktivieren.
            </p>
          </div>
        </div>
      </div>

      {/* Gruppen-Liste */}
      <div className="space-y-3">
        {groups.map((group) => {
          const styles = getGroupStyles(group);
          const part = participation[group.id];
          const isActive = part?.is_active;
          const unread = unreadCounts[group.id] || 0;

          return (
            <div
              key={group.id}
              className={`bg-white dark:bg-stone-800 rounded-2xl border shadow-sm overflow-hidden ${
                isActive ? "border-stone-200 dark:border-stone-700" : "border-stone-100 dark:border-stone-700 opacity-60"
              }`}
            >
              <button
                onClick={() => openChat(group)}
                disabled={!isActive}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${styles.chipClass}`}>
                    <styles.Icon size={18} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-stone-800 dark:text-stone-100">{styles.name}</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {isActive ? "Chat aktiv" : "Chat nicht aktiviert"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isActive && unread > 0 && (
                    <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      !
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight size={20} className="text-stone-400 dark:text-stone-500" />
                  )}
                </div>
              </button>

              {/* Aktivieren-Button wenn nicht aktiv */}
              {!isActive && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => toggleChatParticipation(group.id, true)}
                    className="w-full py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
                  >
                    Chat aktivieren
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings Modal */}
      {settingsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-md shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <Settings size={20} className="text-amber-500" />
                Chat-Einstellungen
              </h3>
              <button
                onClick={() => setSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                <X size={20} className="text-stone-400 dark:text-stone-500" />
              </button>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300">
              Aktiviere oder deaktiviere den Gruppenchat für einzelne Gruppen.
              Bei Deaktivierung werden keine Nachrichten mehr angezeigt.
            </p>

            <div className="space-y-2">
              {groups.map((group) => {
                const styles = getGroupStyles(group);
                const part = participation[group.id];
                const isActive = part?.is_active;

                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-900 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${styles.chipClass}`}>
                        <styles.Icon size={14} />
                      </div>
                      <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                        {styles.name}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleChatParticipation(group.id, !isActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70"
                          : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Check size={12} className="inline mr-1" />
                          Aktiv
                        </>
                      ) : (
                        "Aktivieren"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setSettingsModal(false)}
              className="w-full py-3 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
