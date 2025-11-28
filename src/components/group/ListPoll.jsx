// src/components/group/ListPoll.jsx
import React from "react";
import { StorageService } from "../../lib/storage";

/**
 * Polls (Abstimmungen)
 * Variante B = moderne große Buttons
 *
 * - Single Choice
 * - Eltern können abstimmen, Team nicht
 * - erneuter Klick = Stimme entfernen
 * - Grid-Layout bei vielen Optionen
 */
export default function ListPoll({ list, user, isAdmin, reload }) {
  const items = Array.isArray(list.items) ? list.items : [];

  const toggleVote = (itemIndex) => {
    if (isAdmin) return;

    const all = StorageService.get("grouplists") || [];
    const idx = all.findIndex((l) => l.id === list.id);
    if (idx < 0) return;

    const updated = [...all];
    const li = { ...updated[idx] };
    const arr = [...li.items];

    const entry = { ...arr[itemIndex] };
    entry.votes = Array.isArray(entry.votes) ? [...entry.votes] : [];

    const me = user.username;
    const myIndex = entry.votes.indexOf(me);

    // Single-choice: zuerst eigene Stimme entfernen
    li.items.forEach((i) => {
      if (Array.isArray(i.votes)) {
        const pos = i.votes.indexOf(me);
        if (pos >= 0) i.votes.splice(pos, 1);
      }
    });

    // Falls diese Option schon gewählt war → nicht erneut hinzufügen
    if (myIndex < 0) {
      entry.votes.push(me);
    }

    arr[itemIndex] = entry;
    li.items = arr;

    updated[idx] = li;
    StorageService.set("grouplists", updated);
    reload();
  };

  if (items.length === 0) {
    return (
      <p className="text-xs text-stone-400">Noch keine Abstimmungsoptionen.</p>
    );
  }

  return (
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
        const hasMyVote = votes.includes(user.username);

        const voteText =
          votes.length === 0
            ? "Keine Stimmen"
            : votes.length === 1
            ? "1 Stimme"
            : `${votes.length} Stimmen`;

        const baseClasses =
          "w-full flex flex-col items-center justify-center px-4 py-4 rounded-2xl border text-sm font-bold transition text-center";

        if (isAdmin) {
          // TEAM = Read only
          return (
            <div
              key={idx}
              className={`${baseClasses} bg-stone-50 border-stone-200 text-stone-700`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] text-stone-500 mt-1">{voteText}</span>
            </div>
          );
        }

        // ELTERN = klickbare Buttons
        return (
          <button
            key={idx}
            onClick={() => toggleVote(idx)}
            className={
              hasMyVote
                ? `${baseClasses} bg-amber-500 border-amber-600 text-white`
                : `${baseClasses} bg-stone-50 border-stone-200 text-stone-700 hover:bg-amber-100`
            }
          >
            <span>{item.label}</span>
            <span className="text-[10px] text-stone-700 mt-1">
              {voteText}
            </span>
          </button>
        );
      })}
    </div>
  );
}