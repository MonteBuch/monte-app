// src/components/admin/AdminGroups.jsx
import React, { useEffect, useState } from "react";

import {
  Edit,
  GripVertical,
  Trash2,
  Plus,
  Globe,
  Droplets,
  Flame,
  Sun,
  Flower2,
  Wind,
  Cloud,
  Leaf,
  TreePine,
  Mountain,
  Snowflake,
  MoonStar,
  Palette,
  Brush,
  Blocks,
  Puzzle,
  Music4,
  Baby,
  Smile,
  UsersRound,
  BookOpen,
  Star,
  Clover,
} from "lucide-react";

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

import { StorageService } from "../../lib/storage";
import { GROUPS } from "../../lib/constants";

import AddGroupModal from "./groups/AddGroupModal";
import EditGroupModal from "./groups/EditGroupModal";
import SaveButton from "../ui/SaveButton";

/* ICON SET, Farben, Utilities unverändert … */
export const ICON_SET = [
  { id: "globe", icon: <Globe size={18} /> },
  { id: "droplets", icon: <Droplets size={18} /> },
  { id: "flame", icon: <Flame size={18} /> },
  { id: "sun", icon: <Sun size={18} /> },
  { id: "flower2", icon: <Flower2 size={18} /> },
  { id: "wind", icon: <Wind size={18} /> },
  { id: "cloud", icon: <Cloud size={18} /> },
  { id: "leaf", icon: <Leaf size={18} /> },
  { id: "tree-pine", icon: <TreePine size={18} /> },
  { id: "mountain", icon: <Mountain size={18} /> },
  { id: "snowflake", icon: <Snowflake size={18} /> },
  { id: "moon-star", icon: <MoonStar size={18} /> },
  { id: "palette", icon: <Palette size={18} /> },
  { id: "brush", icon: <Brush size={18} /> },
  { id: "blocks", icon: <Blocks size={18} /> },
  { id: "puzzle", icon: <Puzzle size={18} /> },
  { id: "music-4", icon: <Music4 size={18} /> },
  { id: "baby", icon: <Baby size={18} /> },
  { id: "smile", icon: <Smile size={18} /> },
  { id: "users-round", icon: <UsersRound size={18} /> },
  { id: "book-open", icon: <BookOpen size={18} /> },
  { id: "star", icon: <Star size={18} /> },
  { id: "clover", icon: <Clover size={18} /> },
];

export const COLOR_SET = [
  "bg-amber-400","bg-amber-500",
  "bg-yellow-400","bg-yellow-500",
  "bg-blue-400","bg-blue-500",
  "bg-sky-400","bg-sky-500",
  "bg-cyan-400","bg-cyan-500",
  "bg-green-400","bg-green-500",
  "bg-emerald-400","bg-emerald-500",
  "bg-pink-400","bg-pink-500",
  "bg-rose-400","bg-rose-500",
  "bg-violet-400","bg-violet-500",
];

const extractBgClass = (colorString) => {
  if (!colorString) return "bg-amber-500";
  const parts = colorString.split(" ");
  return parts.find((c) => c.startsWith("bg-")) || "bg-amber-500";
};

const iconFor = (id) => ICON_SET.find((i) => i.id === id)?.icon || <Globe size={18} />;

const reorder = (list, startIndex, endIndex) => {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [initial, setInitial] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [migrateModal, setMigrateModal] = useState(null);
  const [migrationTarget, setMigrationTarget] = useState("");
  const [saved, setSaved] = useState(false);

  /* LOAD GROUPS (unverändert) */
  useEffect(() => {
    const facility = StorageService.getFacilitySettings();
    const stored = facility?.groups;

    if (Array.isArray(stored) && stored.length > 0) {
      setGroups(stored);
      setInitial(stored);
      return;
    }

    const mapped = GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      color: extractBgClass(g.color),
      icon:
        g.id === "erde"
          ? "globe"
          : g.id === "feuer"
          ? "flame"
          : g.id === "sonne"
          ? "sun"
          : g.id === "wasser"
          ? "droplets"
          : g.id === "blume"
          ? "flower2"
          : "globe",
    }));

    setGroups(mapped);
    setInitial(mapped);
  }, []);

  const changed = JSON.stringify(groups) !== JSON.stringify(initial);

  /* SAVE */
  const save = async () => {
    const facility = StorageService.getFacilitySettings() || {};
    StorageService.saveFacilitySettings({
      ...facility,
      groups,
    });
    setInitial(groups);
  };

  /* DRAG & DROP */
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = reorder(groups, result.source.index, result.destination.index);
    setGroups(reordered);
  };

  /* DELETE + MIGRATION (unverändert) */
  const attemptDelete = (group) => {
    if (groups.length <= 1) return;

    const users = StorageService.get("users") || [];

    const childCount = users
      .filter((u) => u.role === "parent")
      .reduce((sum, u) => {
        const kids = u.children || [];
        return sum + kids.filter((c) => c.group === group.id).length;
      }, 0);

    const teamCount = users.filter(
      (u) =>
        (u.role === "team" || u.role === "admin") &&
        u.primaryGroup === group.id
    ).length;

    if (childCount === 0 && teamCount === 0) {
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      return;
    }

    setMigrateModal({
      groupId: group.id,
      name: group.name,
      childCount,
      teamCount,
    });
    setMigrationTarget("");
  };

  const confirmMigration = () => {
    const { groupId } = migrateModal;
    const users = StorageService.get("users") || [];

    const updatedUsers = users.map((u) => {
      if (u.role === "parent") {
        const newKids = (u.children || []).map((c) =>
          c.group === groupId ? { ...c, group: migrationTarget } : c
        );
        return { ...u, children: newKids };
      }

      if (
        (u.role === "team" || u.role === "admin") &&
        u.primaryGroup === groupId
      ) {
        return { ...u, primaryGroup: migrationTarget };
      }

      return u;
    });

    StorageService.set("users", updatedUsers);

    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setMigrateModal(null);
    setMigrationTarget("");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800">Gruppenverwaltung</h2>

      <p className="text-sm text-stone-500">
        Gruppen hinzufügen, bearbeiten, sortieren oder löschen.
      </p>

      {/* Gruppe hinzufügen */}
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95"
      >
        <Plus size={16} />
        Gruppe hinzufügen
      </button>

      {/* DRAG & DROP LISTE */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="groups">
          {(provided) => (
            <div
              className="space-y-3 pt-2"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {groups.map((g, index) => (
                <Draggable draggableId={g.id} index={index} key={g.id}>
                  {(drag) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between"
                    >
                      {/* Links */}
                      <div className="flex items-center gap-3">

                        {/* DragHandle */}
                        <div
                          {...drag.dragHandleProps}
                          className="text-stone-400 cursor-grab active:cursor-grabbing block"
                          style={{ touchAction: "none" }}
                        >
                          <GripVertical size={18} />
                        </div>

                        <div
                          className={`w-2 h-10 rounded-full ${g.color}`}
                        />

                        <div className="text-stone-700">
                          {iconFor(g.icon)}
                        </div>

                        <div>
                          <p className="font-semibold text-sm text-stone-800">
                            {g.name}
                          </p>
                        </div>
                      </div>

                      {/* Rechts */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(g)}
                          className="p-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-200"
                        >
                          <Edit size={14} />
                        </button>

                        <button
                          onClick={() => attemptDelete(g)}
                          disabled={groups.length <= 1}
                          className={`p-2 rounded-lg border ${
                            groups.length <= 1
                              ? "bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed"
                              : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* NEUER SPEICHERN-BUTTON */}
      <SaveButton
        isDirty={changed}
        onClick={save}
        label="Änderungen speichern"
      />

      {/* Modals */}
      {adding && (
        <AddGroupModal
          ICON_SET={ICON_SET}
          COLOR_SET={COLOR_SET}
          onCancel={() => setAdding(false)}
          onSave={(newGroup) => {
            setGroups((prev) => [...prev, newGroup]);
            setAdding(false);
          }}
        />
      )}

      {editing && (
        <EditGroupModal
          group={editing}
          ICON_SET={ICON_SET}
          COLOR_SET={COLOR_SET}
          onCancel={() => setEditing(null)}
          onSave={(updated) => {
            setGroups((arr) =>
              arr.map((g) => (g.id === updated.id ? updated : g))
            );
            setEditing(null);
          }}
        />
      )}

      {migrateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full border border-stone-200 shadow-xl space-y-5">
            <h3 className="font-bold text-stone-800 text-lg">
              Gruppe löschen – Wohin verschieben?
            </h3>

            <p className="text-sm text-stone-600">
              Gruppe <strong>{migrateModal.name}</strong> wird noch verwendet.
            </p>

            {migrateModal.childCount > 0 && (
              <p className="text-sm text-stone-700">
                • {migrateModal.childCount} Kind(er)
              </p>
            )}

            {migrateModal.teamCount > 0 && (
              <p className="text-sm text-stone-700">
                • {migrateModal.teamCount} Teammitglied(er)
              </p>
            )}

            <select
              value={migrationTarget}
              onChange={(e) => setMigrationTarget(e.target.value)}
              className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
            >
              <option value="">Zielgruppe wählen…</option>
              {groups
                .filter((gr) => gr.id !== migrateModal.groupId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setMigrateModal(null);
                  setMigrationTarget("");
                }}
                className="flex-1 py-2 rounded-xl bg-stone-200 text-stone-700 font-semibold"
              >
                Abbrechen
              </button>

              <button
                onClick={confirmMigration}
                disabled={!migrationTarget}
                className={`flex-1 py-2 rounded-xl font-bold ${
                  migrationTarget
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-stone-300 text-stone-500"
                }`}
              >
                Verschieben & Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}