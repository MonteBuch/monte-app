// src/components/group/CreateList.jsx
import React, { useState } from "react";
import { Plus } from "lucide-react";
import { StorageService } from "../../lib/storage";

export default function CreateList({ activeGroup, reload }) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("bring"); // bring | duty | poll
  const [itemsText, setItemsText] = useState("");

  const create = () => {
    if (!title.trim()) return;

    const formattedItems = itemsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) =>
        type === "poll"
          ? { label: l, votes: [] }
          : { label: l, assignedTo: null }
      );

    const payload = {
      id: crypto.randomUUID(),
      title: title.trim(),
      type,
      groupId: activeGroup,
      items: formattedItems,
      createdAt: new Date().toISOString(),
    };

    StorageService.add("grouplists", payload);

    // reset
    setShow(false);
    setTitle("");
    setItemsText("");
    setType("bring");

    reload();
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 space-y-3">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-stone-800">
          Neue Liste anlegen
        </h3>

        <button
          onClick={() => setShow((s) => !s)}
          className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-amber-100"
        >
          <Plus size={16} />
        </button>
      </div>

      {show && (
        <div className="space-y-3">
          <input
            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            placeholder="Titel der Liste…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="bring">Mitbringliste</option>
            <option value="duty">Dienste</option>
            <option value="poll">Abstimmung</option>
          </select>

          <textarea
            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm min-h-[80px]"
            placeholder={
              type === "poll"
                ? "Antwortoptionen, je Zeile eine"
                : "Einträge, je Zeile einer"
            }
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
          />

          <button
            onClick={create}
            className="w-full bg-amber-500 text-white py-2 rounded-xl font-bold hover:bg-amber-600 transition"
          >
            Liste anlegen
          </button>
        </div>
      )}
    </div>
  );
}