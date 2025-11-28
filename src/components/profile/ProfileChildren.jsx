// src/components/profile/ProfileChildren.jsx
import React, { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { GROUPS } from "../../lib/constants";
import { StorageService } from "../../lib/storage";
import ProfileChildModal from "./ProfileChildModal";

function formatBirthday(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ProfileChildren({
  user,
  isTeam,
  onBack,
  onUpdateUser,
}) {
  const [primaryGroup, setPrimaryGroup] = useState(user.primaryGroup || null);
  const [children, setChildren] = useState(user.children || []);
  const [editingChild, setEditingChild] = useState(null);
  const [mode, setMode] = useState("create");
  const [childToDelete, setChildToDelete] = useState(null);

  const handleSaveGroup = () => {
    const all = StorageService.get("users");
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx === -1) return;

    const updated = {
      ...user,
      primaryGroup,
    };

    all[idx] = updated;
    StorageService.set("users", all);
    onUpdateUser(updated);

    alert("Stammgruppe gespeichert.");
  };

  const persistChildren = (updatedChildren) => {
    const all = StorageService.get("users");
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx === -1) return;

    const updatedUser = {
      ...user,
      children: updatedChildren,
    };

    all[idx] = updatedUser;
    StorageService.set("users", all);
    onUpdateUser(updatedUser);
    setChildren(updatedChildren);
  };

  const openCreateModal = () => {
    const defaultGroup =
      children[0]?.group || user.primaryGroup || GROUPS[0]?.id || "erde";

    setMode("create");
    setEditingChild({
      id: crypto.randomUUID(),
      name: "",
      group: defaultGroup,
      birthday: "",
      notes: "",
    });
  };

  const openEditModal = (child) => {
    setMode("edit");
    setEditingChild(child);
  };

  const handleModalSave = (child) => {
    if (mode === "create") {
      persistChildren([...children, child]);
    } else {
      const updated = children.map((c) => (c.id === child.id ? child : c));
      persistChildren(updated);
    }
    setEditingChild(null);
  };

  const handleDelete = () => {
    if (!childToDelete) return;
    const updated = children.filter((c) => c.id !== childToDelete.id);
    persistChildren(updated);
    setChildToDelete(null);
  };

  const isParent = user.role === "parent";

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        className="flex items-center text-stone-500 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800">
        {isTeam ? "Stammgruppe" : "Meine Kinder"}
      </h2>

      {/* TEAM: NUR STAMMGRUPPE */}
      {isTeam && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 uppercase font-bold">
            Stammgruppe
          </p>

          <select
            value={primaryGroup || ""}
            onChange={(e) => setPrimaryGroup(e.target.value)}
            className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          >
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSaveGroup}
            className="w-full bg-amber-500 rounded-xl text-white font-bold py-2 hover:bg-amber-600 active:scale-[0.99] transition"
          >
            Speichern
          </button>
        </div>
      )}

      {/* ELTERN: KINDERLISTE + BEARBEITUNG */}
      {isParent && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-500 uppercase font-bold">
              {children.length === 1 ? "Kind" : "Kinder"}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.99]"
            >
              <Plus size={14} />
              Kind hinzufügen
            </button>
          </div>

          {children.length === 0 && (
            <p className="text-sm text-stone-500">
              Noch keine Kinder hinterlegt.
            </p>
          )}

          <div className="space-y-3">
            {children.map((c) => {
              const group = GROUPS.find((g) => g.id === c.group);
              return (
                <div
                  key={c.id}
                  className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex"
                >
                  {/* Farbbalken links */}
                  <div
                    className={`w-2 ${
                      group?.color || "bg-stone-400"
                    }`}
                  />

                  <div className="flex-1 p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-stone-800 text-sm">
                        {c.name}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                        {group?.icon}
                        <span>{group?.name}</span>
                      </p>
                      {(c.birthday || c.notes) && (
                        <p className="text-[11px] text-stone-400 mt-1">
                          {c.birthday &&
                            `Geburtstag: ${formatBirthday(c.birthday)}`}
                          {c.birthday && c.notes && " • "}
                          {c.notes && "Hinweise hinterlegt"}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setChildToDelete(c)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CHILD EDIT / CREATE */}
      {editingChild && (
        <ProfileChildModal
          initialChild={editingChild}
          mode={mode}
          onCancel={() => setEditingChild(null)}
          onSave={handleModalSave}
        />
      )}

      {/* MODAL: DELETE CONFIRM */}
      {childToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-800 mb-1">
              Kind löschen?
            </h3>
            <p className="text-sm text-stone-600">
              Möchtest du <strong>{childToDelete.name}</strong> wirklich aus deinem Profil entfernen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChildToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-300"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 active:scale-[0.99]"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}