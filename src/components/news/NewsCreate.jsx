// src/components/news/NewsCreate.jsx
import React, { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { StorageService } from "../../lib/storage";

export default function NewsCreate({ user, groups, onSubmit }) {
  const facilityGroups =
    groups && groups.length > 0
      ? groups
      : StorageService.getDefaultGroups();

  // Standard: Team → eigene Stammgruppe, Admin → "all"
  const initialTarget = useMemo(() => {
    if (user.role === "team" && user.primaryGroup) {
      return user.primaryGroup;
    }
    return "all";
  }, [user]);

  const [text, setText] = useState("");
  const [target, setTarget] = useState(initialTarget);

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

  return (
    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">
            Neue Mitteilung
          </h3>
          <p className="text-[11px] text-stone-500">
            Wähle die Zielgruppe und verfasse eine kurze Nachricht.
          </p>
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

      {/* Zielgruppen-Auswahl */}
      <div className="space-y-1">
        <label className="text-xs uppercase text-stone-500 font-semibold">
          Zielgruppe
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTarget("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              target === "all"
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            Alle
          </button>

          {facilityGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setTarget(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                target === g.id ? g.dark : "bg-stone-100 text-stone-700"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 active:scale-95 flex items-center justify-center gap-2 text-sm"
      >
        <Send size={18} />
        Mitteilung senden
      </button>
    </div>
  );
}