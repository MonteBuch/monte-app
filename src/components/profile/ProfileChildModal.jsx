// src/components/profile/ProfileChildModal.jsx
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GROUPS } from "../../lib/constants";

export default function ProfileChildModal({
  initialChild,
  mode = "create", // "create" | "edit"
  onCancel,
  onSave,
}) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState(GROUPS[0]?.id || "erde");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialChild) return;
    setName(initialChild.name || "");
    setGroup(initialChild.group || GROUPS[0]?.id || "erde");
    setBirthday(initialChild.birthday || "");
    setNotes(initialChild.notes || "");
  }, [initialChild]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }

    if (!group) {
      setError("Bitte eine Gruppe auswählen.");
      return;
    }

    const payload = {
      ...(initialChild || {}),
      name: name.trim(),
      group,
      birthday: birthday || null,
      notes: notes.trim() || null,
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-800">
            {mode === "edit" ? "Kind bearbeiten" : "Kind hinzufügen"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
              placeholder="Name des Kindes"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Gruppe
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            >
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-stone-100 mt-1">
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Optionale Angaben
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  Geburtstag
                </label>
                <input
                  type="date"
                  value={birthday || ""}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  Allergien / Hinweise
                </label>
                <textarea
                  rows={2}
                  value={notes || ""}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm resize-none"
                  placeholder="Optional, z. B. Allergien oder Hinweise"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-300"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 active:scale-[0.99]"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}