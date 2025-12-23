// src/components/admin/AdminUserModal.jsx
import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import SaveButton from "../ui/SaveButton";

export default function AdminUserModal({ user, groups = [], onCancel, onSave }) {
  const displayGroups = groups.filter(g => !g.is_event_group);

  const [name, setName] = useState(user.name || "");
  const [primaryGroup, setPrimaryGroup] = useState(user.primaryGroup || "");
  const [children, setChildren] = useState(user.children || []);

  const changed =
    name !== (user.name || "") ||
    primaryGroup !== (user.primaryGroup || "") ||
    JSON.stringify(children) !== JSON.stringify(user.children || []);

  const updateChild = (id, key, value) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  const addChild = () => {
    const id = crypto.randomUUID();
    const defaultGroup = primaryGroup || (displayGroups[0]?.id) || "";
    setChildren((prev) => [
      ...prev,
      {
        id,
        name: "",
        group: defaultGroup,
      },
    ]);
  };

  const deleteChild = (id) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const saveUser = () => {
    const updated = {
      ...user,
      name: name.trim(),
      // Nur Team hat eine Stammgruppe (nicht parent, nicht admin)
      primaryGroup: user.role === "team" ? primaryGroup : undefined,
      children: user.role === "parent" ? children : undefined,
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-lg space-y-6 border border-stone-200 shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Back Button */}
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 active:scale-95"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold text-sm">Zurück</span>
        </button>

        <h3 className="text-lg font-bold text-stone-800">
          Benutzer bearbeiten
        </h3>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs uppercase text-stone-500 font-semibold">
            Name
          </label>
          <input
            className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Gruppe (nur Team - Admin hat keine Stammgruppe) */}
        {user.role === "team" && (
          <div className="space-y-1">
            <label className="text-xs uppercase text-stone-500 font-semibold">
              Stammgruppe
            </label>

            <select
              className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
              value={primaryGroup}
              onChange={(e) => setPrimaryGroup(e.target.value)}
            >
              <option value="">Keine</option>
              {displayGroups.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kinderdaten (nur Eltern) */}
        {user.role === "parent" && (
          <div className="space-y-3 pt-3">
            <h4 className="text-md font-semibold text-stone-800">
              Kinder
            </h4>

            {children.map((c) => (
              <div
                key={c.id}
                className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex justify-between items-start"
              >
                <div className="space-y-2 w-full pr-3">

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">
                      Name
                    </label>
                    <input
                      className="w-full p-2 rounded-lg border border-stone-300 bg-white text-sm"
                      value={c.name}
                      onChange={(e) =>
                        updateChild(c.id, "name", e.target.value)
                      }
                    />
                  </div>

                  {/* Gruppe */}
                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">
                      Gruppe
                    </label>
                    <select
                      className="w-full p-2 rounded-lg border border-stone-300 bg-white text-sm"
                      value={c.group}
                      onChange={(e) =>
                        updateChild(c.id, "group", e.target.value)
                      }
                    >
                      {displayGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hinweis auf Kinderakten */}
                  <p className="text-[11px] text-stone-400 mt-2">
                    Geburtstag, Hinweise und Abholberechtigte werden in den Kinderakten verwaltet.
                  </p>
                </div>

                {/* Delete child */}
                <button
                  onClick={() => deleteChild(c.id)}
                  className="p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Kind hinzufügen */}
            <button
              onClick={addChild}
              className="w-full mt-2 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Kind hinzufügen
            </button>
          </div>
        )}

        {/* SAVE BUTTON */}
        <SaveButton
          isDirty={changed}
          onClick={saveUser}
          label="Änderungen speichern"
        />
      </div>
    </div>
  );
}
