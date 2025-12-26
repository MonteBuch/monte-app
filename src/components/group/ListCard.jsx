// src/components/group/ListCard.jsx
import React from "react";
import {
  Trash2,
  ClipboardList,
  ListChecks,
  BarChart,
  GripVertical,
} from "lucide-react";

import { supabase } from "../../api/supabaseClient";   // ⬅️ Neu
import ListItems from "./ListItems";
import ListPoll from "./ListPoll";

const LIST_META = {
  bring: {
    label: "Mitbringliste",
    icon: <ClipboardList size={16} />,
  },
  duty: {
    label: "Dienste",
    icon: <ListChecks size={16} />,
  },
  poll: {
    label: "Abstimmung",
    icon: <BarChart size={16} />,
  },
};

export default function ListCard({ list, isAdmin, user, group, reload, dragHandleProps }) {
  const meta = LIST_META[list.type] || LIST_META.bring;

  // ─────────────────────────────────────────────
  // LISTE LÖSCHEN (Supabase)
  // ─────────────────────────────────────────────
  const handleDeleteList = async () => {
    if (!confirm("Liste wirklich löschen?")) return;

    const { error } = await supabase
      .from("group_lists")
      .delete()
      .eq("id", list.id);

    if (error) {
      console.error("Fehler beim Löschen der Liste:", error);
      alert("Fehler beim Löschen der Liste.");
      return;
    }

    reload(); // UI aktualisieren
  };

  return (
    <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 space-y-3">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Drag Handle - nur wenn dragHandleProps übergeben */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 transition -ml-1 mr-1"
            >
              <GripVertical size={18} />
            </div>
          )}

          <div className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-full p-2">
            {meta.icon}
          </div>

          <div>
            <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm">
              {list.title}
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              {meta.label}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleDeleteList}
            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* LISTEN-INHALT */}
      {list.type === "poll" ? (
        <ListPoll
          list={list}
          user={user}
          group={group}
          isAdmin={isAdmin}
          reload={reload}
        />
      ) : (
        <ListItems
          list={list}
          user={user}
          group={group}
          isAdmin={isAdmin}
          reload={reload}
        />
      )}
    </div>
  );
}