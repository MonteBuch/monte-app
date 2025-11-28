// src/components/admin/groups/EditGroupModal.jsx
import React, { useState } from "react";

export default function EditGroupModal({
  group,
  ICON_SET,
  COLOR_SET,
  onCancel,
  onSave,
}) {
  const [name, setName] = useState(group.name);
  const [icon, setIcon] = useState(group.icon || ICON_SET[0]?.id || "globe");
  const [color, setColor] = useState(group.color || COLOR_SET[0] || "bg-amber-500");

  const handleSave = () => {
    if (!name.trim()) return;

    const updated = {
      ...group,
      name: name.trim(),
      icon,
      color,
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/40 p-4 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-md border border-stone-200 shadow-xl space-y-5">
        <h3 className="text-lg font-bold text-stone-800">Gruppe bearbeiten</h3>

        {/* Name */}
        <div>
          <label className="text-xs text-stone-500 uppercase font-semibold">
            Gruppenname
          </label>
          <input
            className="w-full mt-1 p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Icons */}
        <div>
          <label className="text-xs text-stone-500 uppercase font-semibold">
            Icon
          </label>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {ICON_SET.map((ic) => (
              <button
                key={ic.id}
                type="button"
                onClick={() => setIcon(ic.id)}
                className={`p-2 rounded-xl border flex items-center justify-center ${
                  icon === ic.id
                    ? "bg-amber-100 border-amber-300"
                    : "bg-stone-50 border-stone-300 hover:bg-stone-100"
                }`}
              >
                <span className="text-stone-700">{ic.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Farben */}
        <div>
          <label className="text-xs text-stone-500 uppercase font-semibold">
            Farbe
          </label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {COLOR_SET.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 rounded-xl border ${
                  color === c
                    ? "border-amber-400 scale-95"
                    : "border-stone-300"
                } ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold text-sm"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}