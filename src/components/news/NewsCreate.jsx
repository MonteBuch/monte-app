// src/components/news/NewsCreate.jsx
import React, { useMemo, useState } from "react";
import { Send, Megaphone } from "lucide-react";
import { StorageService } from "../../lib/storage";

/**
 * NewsCreate – Eingabeformular für neue Mitteilungen.
 * - Enthält einen farbigen Header mit Gruppenauswahl.
 * - Der Senden‑Button zeigt dynamisch den Namen der aktuellen Zielgruppe an.
 */
export default function NewsCreate({ user, groups, onSubmit }) {
  const facilityGroups =
    groups && groups.length > 0
      ? groups
      : StorageService.getDefaultGroups();

  // Standardziel: Team → eigene Stammgruppe, Admin → alle
  const initialTarget = useMemo(() => {
    if (user.role === "team" && user.primaryGroup) {
      return user.primaryGroup;
    }
    return "all";
  }, [user]);

  const [text, setText] = useState("");
  const [target, setTarget] = useState(initialTarget);

  // Nachricht senden
  const handleSubmit = () => {
    if (!text.trim()) return;

    const item = {
      id: crypto.randomUUID(),
      text: text.trim(),
      createdBy: user.username,
      groupId: target === "all" ? null : target,
      target,
      date: new Date().toISOString(),
    };

    onSubmit(item);
    setText("");
    setTarget(initialTarget);
  };

  // Aktuell ausgewählte Gruppe
  const selectedGroup =
    target !== "all"
      ? facilityGroups.find((g) => g.id === target)
      : null;

  // Header‑Design abhängig von Gruppe
  const headerBg = selectedGroup
    ? selectedGroup.light
    : "bg-stone-100 text-stone-800";
  const iconBg = selectedGroup
    ? selectedGroup.color
    : "bg-stone-200 text-stone-700";
  const headerIcon = selectedGroup ? selectedGroup.icon : (
    <Megaphone size={16} />
  );
  const targetLabel =
    target === "all"
      ? "Alle"
      : selectedGroup
      ? selectedGroup.name
      : "Alle";

  return (
    <div className="space-y-4">
      {/* Header mit Titel & Gruppenauswahl */}
      <div className={`p-5 rounded-2xl border shadow-sm ${headerBg}`}>
        <div className="flex items-center gap-3">
          <div className={`${iconBg} p-2 rounded-2xl shadow`}>
            {headerIcon}
          </div>
          <div>
            <h3 className="text-lg font-bold">News</h3>
            <p className="text-xs">Neue Mitteilung an Eltern senden</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Alle‑Chip */}
          <button
            type="button"
            onClick={() => setTarget("all")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              target === "all"
                ? "bg-stone-800 text-white border-stone-900"
                : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
            }`}
          >
            Alle
          </button>
          {/* Gruppen‑Chips */}
          {facilityGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setTarget(g.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                target === g.id
                  ? `${g.color} border-transparent`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              {g.icon}
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textfeld */}
      <div className="space-y-1">
        <label className="text-xs uppercase text-stone-500 font-semibold">
          Mitteilung
        </label>
        <textarea
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm resize-none"
          placeholder="Kurze Info für Eltern oder Team..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
      </div>

      {/* Dynamischer Senden‑Button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 active:scale-95 flex items-center justify-center gap-2 text-sm"
      >
        <Send size={18} />
        {`Mitteilung an ${targetLabel} senden`}
      </button>
    </div>
  );
}