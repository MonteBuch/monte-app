// src/components/profile/ProfileChildren.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";
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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [mode, setMode] = useState("create");
  const [childToDelete, setChildToDelete] = useState(null);

  // Gruppen laden
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .order("position");

        setGroups(data || []);
      } catch (err) {
        console.error("Gruppen laden fehlgeschlagen:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGroups();
  }, []);

  const displayGroups = groups.filter(g => !g.is_event_group);

  const handleSaveGroup = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ primary_group: primaryGroup })
        .eq("id", user.id);

      if (error) throw error;

      const updated = { ...user, primaryGroup };
      onUpdateUser(updated);
      alert("Stammgruppe gespeichert.");
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      alert("Fehler: " + err.message);
    }
    setSaving(false);
  };

  const persistChildren = async (updatedChildren) => {
    // Lokalen State sofort aktualisieren
    setChildren(updatedChildren);

    const updatedUser = { ...user, children: updatedChildren };
    onUpdateUser(updatedUser);
  };

  const openCreateModal = () => {
    const defaultGroup =
      children[0]?.group ||
      user.primaryGroup ||
      displayGroups[0]?.id ||
      null;

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

  const handleModalSave = async (child) => {
    try {
      if (mode === "create") {
        // Kind in Supabase anlegen
        const { error } = await supabase
          .from("children")
          .insert({
            id: child.id,
            facility_id: FACILITY_ID,
            user_id: user.id,
            first_name: child.name,
            group_id: child.group,
            birthday: child.birthday || null,
            notes: child.notes || null,
          });

        if (error) throw error;

        persistChildren([...children, child]);
      } else {
        // Kind in Supabase updaten
        const { error } = await supabase
          .from("children")
          .update({
            first_name: child.name,
            group_id: child.group,
            birthday: child.birthday || null,
            notes: child.notes || null,
          })
          .eq("id", child.id);

        if (error) throw error;

        const updated = children.map((c) => (c.id === child.id ? child : c));
        persistChildren(updated);
      }
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      alert("Fehler: " + err.message);
    }

    setEditingChild(null);
  };

  const handleDelete = async () => {
    if (!childToDelete) return;

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", childToDelete.id);

      if (error) throw error;

      const updated = children.filter((c) => c.id !== childToDelete.id);
      persistChildren(updated);
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      alert("Fehler: " + err.message);
    }

    setChildToDelete(null);
  };

  const isParent = user.role === "parent";

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="flex items-center text-stone-500 dark:text-stone-400 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
        {isTeam ? "Stammgruppe" : "Meine Kinder"}
      </h2>

      {isTeam && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 uppercase font-bold">Stammgruppe</p>
          <select
            value={primaryGroup || ""}
            onChange={(e) => setPrimaryGroup(e.target.value)}
            className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-sm text-stone-900 dark:text-stone-100"
          >
            <option value="">Keine</option>
            {displayGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button
            onClick={handleSaveGroup}
            disabled={saving}
            className="w-full bg-amber-500 rounded-xl text-white font-bold py-2 hover:bg-amber-600 active:scale-[0.99] transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Speichern"}
          </button>
        </div>
      )}

      {isParent && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-500 dark:text-stone-400 uppercase font-bold">
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
            <p className="text-sm text-stone-500 dark:text-stone-400">Noch keine Kinder hinterlegt.</p>
          )}

          <div className="space-y-3">
            {children.map((c) => {
              const groupData = getGroupById(displayGroups, c.group);
              const styles = getGroupStyles(groupData);

              return (
                <div key={c.id} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm overflow-hidden flex">
                  <div className={`w-2 ${styles.chipClass.replace("text-white", "")}`} />
                  <div className="flex-1 p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">{c.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
                        <styles.Icon size={14} />
                        <span>{styles.name}</span>
                      </p>
                      {(c.birthday || c.notes) && (
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                          {c.birthday && `Geburtstag: ${formatBirthday(c.birthday)}`}
                          {c.birthday && c.notes && " • "}
                          {c.notes && "Hinweise hinterlegt"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-2 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setChildToDelete(c)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
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

      {editingChild && (
        <ProfileChildModal
          initialChild={editingChild}
          groups={displayGroups}
          mode={mode}
          onCancel={() => setEditingChild(null)}
          onSave={handleModalSave}
        />
      )}

      {childToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-1">Kind löschen?</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Möchtest du <strong>{childToDelete.name}</strong> wirklich entfernen?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChildToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-sm font-semibold hover:bg-stone-300 dark:hover:bg-stone-600"
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
