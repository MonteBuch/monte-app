// src/components/group/ListCard.jsx
import React from "react";
import {
  Trash2,
  ClipboardList,
  CheckSquare,
  ListChecks,
  BarChart,
} from "lucide-react";
import { StorageService } from "../../lib/storage";
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

export default function ListCard({ list, isAdmin, user, group, reload }) {
  const meta = LIST_META[list.type] || LIST_META.bring;

  const handleDeleteList = () => {
    if (!confirm("Liste wirklich löschen?")) return;
    StorageService.delete("grouplists", list.id);
    reload();
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-3">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-stone-100 text-stone-700 rounded-full p-2">
            {meta.icon}
          </div>

          <div>
            <h3 className="font-bold text-stone-800 text-sm">
              {list.title}
            </h3>
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">
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