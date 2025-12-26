// src/components/group/ListPoll.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, Users } from "lucide-react";
import { supabase } from "../../api/supabaseClient";

/**
 * Polls (Abstimmungen)
 * - Single Choice
 * - Eltern können abstimmen, Team nicht
 * - erneuter Klick = Stimme entfernen
 * - Grid-Layout bei vielen Optionen
 * - Anonymität-Option (config.isAnonymous)
 * - Teilnahme-Statistik (showStatsToParents)
 */
export default function ListPoll({ list, user, isAdmin, reload }) {
  const items = Array.isArray(list.items) ? list.items : [];
  const config = list.config || {};
  const isAnonymous = config.isAnonymous !== false; // Default: anonym
  const showStatsToParents = config.showStatsToParents === true; // Default: false

  // Teilnahme-Statistik: Anzahl Eltern in der Gruppe
  const [parentCount, setParentCount] = useState(0);
  const [voterNames, setVoterNames] = useState({});

  // Wer hat bereits abgestimmt? (einzigartige User-IDs über alle Optionen)
  const votedUserIds = useMemo(() => {
    const allVotes = items.flatMap((item) => item.votes || []);
    return [...new Set(allVotes)];
  }, [items]);

  // Lade Anzahl der Eltern in der Gruppe
  useEffect(() => {
    async function loadParentCount() {
      if (!list.group_id) return;

      const { data: children, error } = await supabase
        .from("children")
        .select("user_id")
        .eq("group_id", list.group_id);

      if (!error && children) {
        const uniqueParents = [...new Set(children.filter((c) => c.user_id).map((c) => c.user_id))];
        setParentCount(uniqueParents.length);
      }
    }

    loadParentCount();
  }, [list.group_id]);

  // Lade Namen der Abstimmenden (separat, nur wenn nicht anonym und Admin)
  useEffect(() => {
    async function loadVoterNames() {
      if (isAnonymous || !isAdmin || votedUserIds.length === 0) {
        setVoterNames({});
        return;
      }

      // Lade zuerst alle Kinder der Abstimmenden
      const { data: voterChildren } = await supabase
        .from("children")
        .select("user_id, first_name")
        .in("user_id", votedUserIds);

      const namesMap = {};

      // Kindernamen zuordnen
      if (voterChildren) {
        voterChildren.forEach((c) => {
          if (c.user_id && !namesMap[c.user_id]) {
            namesMap[c.user_id] = c.first_name;
          }
        });
      }

      // Für fehlende: Profile-Namen laden
      const missingIds = votedUserIds.filter((id) => !namesMap[id]);
      if (missingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", missingIds);

        if (profiles) {
          profiles.forEach((p) => {
            namesMap[p.id] = p.full_name || "Unbekannt";
          });
        }
      }

      setVoterNames(namesMap);
    }

    loadVoterNames();
  }, [isAnonymous, isAdmin, JSON.stringify(votedUserIds)]);

  // ────────────────────────────────────────────────
  //   Supabase-Speichern der aktualisierten Items
  // ────────────────────────────────────────────────
  const saveToSupabase = async (newItems) => {
    const { error } = await supabase
      .from("group_lists")
      .update({ items: newItems })
      .eq("id", list.id);

    if (error) {
      console.error("Fehler beim Speichern der Poll-Daten:", error);
      alert("Fehler beim Speichern.");
      return;
    }

    reload();
  };

  // ────────────────────────────────────────────────
  //   VOTE TOGGLEN
  // ────────────────────────────────────────────────
  const toggleVote = async (itemIndex) => {
    if (isAdmin) return;

    const myId = user.id;
    const newItems = items.map((item, idx) => {
      const votes = Array.isArray(item.votes) ? [...item.votes] : [];

      // Entferne meine Stimme aus allen Optionen
      const filteredVotes = votes.filter((v) => v !== myId);

      // Zieloption → ggf. Stimme setzen
      if (idx === itemIndex) {
        const hadVote = votes.includes(myId);

        if (!hadVote) {
          filteredVotes.push(myId);
        }
      }

      return {
        ...item,
        votes: filteredVotes,
      };
    });

    await saveToSupabase(newItems);
  };

  if (items.length === 0) {
    return (
      <p className="text-xs text-stone-400 dark:text-stone-500">Noch keine Abstimmungsoptionen.</p>
    );
  }

  // Soll die Statistik angezeigt werden?
  const showStats = isAdmin || showStatsToParents;

  return (
    <div className="space-y-3">
      {/* Anonymität-Status & Teilnahme-Statistik */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Anonymität-Anzeige */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
            isAnonymous
              ? "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
              : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
          }`}
        >
          {isAnonymous ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>
            {isAnonymous
              ? "Anonyme Abstimmung"
              : isAdmin
              ? "Namen sichtbar"
              : "Kitateam sieht Namen"
            }
          </span>
        </div>

        {/* Teilnahme-Statistik - nur wenn erlaubt */}
        {showStats && parentCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
            <Users size={12} />
            <span>
              {votedUserIds.length} von {parentCount} abgestimmt
            </span>
          </div>
        )}
      </div>

      {/* Abstimmungs-Optionen */}
      <div
        className={`grid gap-2 ${
          items.length <= 2
            ? "grid-cols-1"
            : items.length === 3
            ? "grid-cols-2"
            : "grid-cols-2"
        }`}
      >
        {items.map((item, idx) => {
          const votes = Array.isArray(item.votes) ? item.votes : [];
          const hasMyVote = votes.includes(user.id);

          const voteText =
            votes.length === 0
              ? "Keine Stimmen"
              : votes.length === 1
              ? "1 Stimme"
              : `${votes.length} Stimmen`;

          const baseClasses =
            "w-full flex flex-col items-center justify-center px-4 py-4 rounded-2xl border text-sm font-bold transition text-center";

          // ADMIN / TEAM (read only)
          if (isAdmin) {
            return (
              <div
                key={idx}
                className={`${baseClasses} bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">{voteText}</span>

                {/* Voter-Namen anzeigen wenn nicht anonym */}
                {!isAnonymous && votes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700 w-full">
                    <div className="flex flex-wrap justify-center gap-1">
                      {votes.map((voterId) => (
                        <span
                          key={voterId}
                          className="text-[9px] bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700"
                        >
                          {voterNames[voterId] || "Lädt..."}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // ELTERN (klickbare Poll Options)
          return (
            <button
              key={idx}
              onClick={() => toggleVote(idx)}
              className={
                hasMyVote
                  ? `${baseClasses} bg-amber-500 border-amber-600 text-white`
                  : `${baseClasses} bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-900/30`
              }
            >
              <span>{item.label}</span>
              <span className={`text-[10px] mt-1 ${hasMyVote ? "text-amber-100" : "text-stone-500 dark:text-stone-400"}`}>
                {voteText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
