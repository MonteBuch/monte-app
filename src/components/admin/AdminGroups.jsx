// src/components/admin/AdminGroups.jsx
import React, { useEffect, useState, useCallback } from "react";

import {
  Edit,
  GripVertical,
  Trash2,
  Plus,
  Globe,
  Loader2,
} from "lucide-react";

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  countChildrenInGroup,
  countTeamInGroup,
  migrateChildrenToGroup,
  migrateTeamToGroup,
} from "../../api/groupApi";

import { ICON_POOL, DEFAULT_ICON } from "../../utils/groupUtils";

import AddGroupModal from "./groups/AddGroupModal";
import EditGroupModal from "./groups/EditGroupModal";

// ICON_SET aus ICON_POOL generieren (für Modals)
// Filtere Legacy-Aliase (water, tree, sprout) raus
const ICON_SET_IDS = [
  "globe", "droplets", "flame", "sun", "flower2", "wind", "cloud", "leaf",
  "tree-pine", "mountain", "snowflake", "moon-star", "palette", "brush",
  "blocks", "puzzle", "music-4", "baby", "smile", "users-round",
  "book-open", "star", "clover", "rainbow"
];

export const ICON_SET = ICON_SET_IDS.map((id) => {
  const IconComponent = ICON_POOL[id] || DEFAULT_ICON;
  return { id, icon: <IconComponent size={18} /> };
});

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
  // Brauntöne / Erde
  "bg-amber-700", "bg-amber-800",
  "bg-stone-600", "bg-stone-700",
];

const extractBgClass = (colorString) => {
  if (!colorString) return "bg-amber-500";
  const parts = colorString.split(" ");
  return parts.find((c) => c.startsWith("bg-")) || "bg-amber-500";
};

const iconFor = (id) => {
  const IconComponent = ICON_POOL[id] || DEFAULT_ICON;
  return <IconComponent size={18} />;
};

const reorder = (list, startIndex, endIndex) => {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [migrateModal, setMigrateModal] = useState(null);
  const [migrationTarget, setMigrationTarget] = useState("");

  // Gruppen laden
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data || []);
    } catch (err) {
      console.error("Gruppen laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = reorder(
      groups,
      result.source.index,
      result.destination.index
    );
    setGroups(reordered);

    // Speichere neue Reihenfolge in Supabase
    try {
      await reorderGroups(reordered.map((g) => g.id));
    } catch (err) {
      console.error("Reihenfolge speichern fehlgeschlagen:", err);
    }
  };

  const attemptDelete = async (group) => {
    // Event-Gruppe ist nicht löschbar
    if (group.is_event_group) return;

    if (groups.length <= 1) return;

    try {
      const childCount = await countChildrenInGroup(group.id);
      const teamCount = await countTeamInGroup(group.id);

      if (childCount === 0 && teamCount === 0) {
        // Direkt löschen
        await deleteGroup(group.id);
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
        return;
      }

      // Migration erforderlich
      setMigrateModal({
        groupId: group.id,
        name: group.name,
        childCount,
        teamCount,
      });
      setMigrationTarget("");
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      alert("Fehler beim Löschen: " + err.message);
    }
  };

  const confirmMigration = async () => {
    const { groupId } = migrateModal;

    setSaving(true);
    try {
      // Kinder und Team verschieben
      await migrateChildrenToGroup(groupId, migrationTarget);
      await migrateTeamToGroup(groupId, migrationTarget);

      // Gruppe löschen
      await deleteGroup(groupId);

      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setMigrateModal(null);
      setMigrationTarget("");
    } catch (err) {
      console.error("Migration fehlgeschlagen:", err);
      alert("Fehler bei der Migration: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGroup = async (newGroup) => {
    try {
      const created = await createGroup({
        ...newGroup,
        position: groups.length,
      });
      setGroups((prev) => [...prev, created]);
      setAdding(false);
    } catch (err) {
      console.error("Gruppe erstellen fehlgeschlagen:", err);
      alert("Fehler beim Erstellen: " + err.message);
    }
  };

  const handleUpdateGroup = async (updated) => {
    try {
      await updateGroup(updated.id, updated);
      setGroups((arr) =>
        arr.map((g) => (g.id === updated.id ? { ...g, ...updated } : g))
      );
      setEditing(null);
    } catch (err) {
      console.error("Gruppe aktualisieren fehlgeschlagen:", err);
      alert("Fehler beim Aktualisieren: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Gruppenverwaltung</h2>

      <p className="text-sm text-stone-500 dark:text-stone-400">
        Gruppen hinzufügen, bearbeiten, sortieren oder löschen.
      </p>

      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95"
      >
        <Plus size={16} />
        Gruppe hinzufügen
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="groups">
          {(provided) => (
            <div
              className="space-y-3 pt-2"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {groups.map((g, index) => (
                <Draggable key={g.id} draggableId={g.id} index={index}>
                  {(drag) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-between"
                    >
                      {/* Links: Handle, Farbbalken, Icon, Name */}
                      <div className="flex items-center gap-3">
                        <div
                          {...drag.dragHandleProps}
                          className="cursor-grab text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        >
                          <GripVertical size={18} />
                        </div>

                        <div
                          className={`w-2 h-10 rounded-full ${g.color}`}
                        />

                        <div className="text-stone-700 dark:text-stone-200">
                          {iconFor(g.icon)}
                        </div>

                        <div>
                          <p className="font-semibold text-sm text-stone-800 dark:text-stone-100">
                            {g.name}
                          </p>
                        </div>
                      </div>

                      {/* Rechts: Edit / Delete – Event ist geschützt */}
                      <div className="flex items-center gap-2">
                        {!g.is_event_group && (
                          <button
                            onClick={() => setEditing(g)}
                            className="p-2 bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600"
                          >
                            <Edit size={14} />
                          </button>
                        )}

                        {!g.is_event_group && (
                          <button
                            onClick={() => attemptDelete(g)}
                            disabled={groups.length <= 1}
                            className={`p-2 rounded-lg border ${
                              groups.length <= 1
                                ? "bg-stone-100 dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-300 dark:text-stone-500 cursor-not-allowed"
                                : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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

      {adding && (
        <AddGroupModal
          ICON_SET={ICON_SET}
          COLOR_SET={COLOR_SET}
          onCancel={() => setAdding(false)}
          onSave={handleAddGroup}
        />
      )}

      {editing && (
        <EditGroupModal
          group={editing}
          ICON_SET={ICON_SET}
          COLOR_SET={COLOR_SET}
          onCancel={() => setEditing(null)}
          onSave={handleUpdateGroup}
        />
      )}

      {migrateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-700 shadow-xl space-y-5">
            <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">
              Gruppe löschen – Wohin verschieben?
            </h3>

            <p className="text-sm text-stone-600 dark:text-stone-300">
              Gruppe <strong>{migrateModal.name}</strong> wird noch verwendet.
            </p>

            {migrateModal.childCount > 0 && (
              <p className="text-sm text-stone-700 dark:text-stone-200">
                • {migrateModal.childCount} Kind(er)
              </p>
            )}

            {migrateModal.teamCount > 0 && (
              <p className="text-sm text-stone-700 dark:text-stone-200">
                • {migrateModal.teamCount} Teammitglied(er)
              </p>
            )}

            <select
              value={migrationTarget}
              onChange={(e) => setMigrationTarget(e.target.value)}
              className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-sm dark:text-stone-100"
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
                className="flex-1 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold"
              >
                Abbrechen
              </button>

              <button
                onClick={confirmMigration}
                disabled={!migrationTarget}
                className={`flex-1 py-2 rounded-xl font-bold ${
                  migrationTarget
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-stone-300 dark:bg-stone-600 text-stone-500 dark:text-stone-400"
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