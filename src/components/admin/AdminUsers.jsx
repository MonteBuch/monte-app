// src/components/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { User, Users, Shield, KeyRound, Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import AdminUserModal from "./AdminUserModal";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmResetUser, setConfirmResetUser] = useState(null);

  // User und Gruppen laden
  useEffect(() => {
    async function loadData() {
      try {
        // Gruppen laden
        const { data: groupsData } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .order("position");

        setGroups(groupsData || []);

        // User mit Kindern laden
        const { data: profilesData, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            email,
            role,
            primary_group,
            must_reset_password,
            children (
              id,
              first_name,
              birthday,
              notes,
              group_id
            )
          `)
          .eq("facility_id", FACILITY_ID);

        if (error) throw error;

        // Format für Kompatibilität
        const formattedUsers = (profilesData || []).map(p => ({
          id: p.id,
          name: p.full_name,
          email: p.email,
          role: p.role,
          primaryGroup: p.primary_group,
          mustResetPassword: p.must_reset_password,
          children: (p.children || []).map(c => ({
            id: c.id,
            name: c.first_name,
            group: c.group_id,
            birthday: c.birthday,
            notes: c.notes,
          })),
        }));

        setUsers(formattedUsers);
      } catch (err) {
        console.error("Laden fehlgeschlagen:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getGroupById = (id) => groups.find((g) => g.id === id);

  const roleLabel = (role) => {
    if (role === "admin") return "Leitung";
    if (role === "team") return "Team";
    return "Eltern";
  };

  const childSummary = (user) => {
    if (!user.children || user.children.length === 0) return null;
    const count = user.children.length;
    const prefix = count === 1 ? "Kind" : "Kinder";

    const parts = user.children.map((c) => {
      const g = getGroupById(c.group);
      const groupName = g ? g.name : c.group || "ohne Gruppe";
      return `${c.name} (${groupName})`;
    });

    return `${prefix}: ${parts.join(", ")}`;
  };

  const openEdit = (user) => {
    setEditingUser(user);
  };

  const handleSaveUser = async (updatedUser) => {
    try {
      // Profil updaten
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: updatedUser.name,
          primary_group: updatedUser.primaryGroup || null,
        })
        .eq("id", updatedUser.id);

      if (profileError) throw profileError;

      // Kinder updaten (bei Eltern)
      if (updatedUser.role === "parent" && updatedUser.children) {
        // Bestehende Kinder abrufen
        const { data: existingChildren } = await supabase
          .from("children")
          .select("id")
          .eq("user_id", updatedUser.id);

        const existingIds = (existingChildren || []).map(c => c.id);
        const newIds = updatedUser.children.map(c => c.id);

        // Gelöschte Kinder entfernen
        const toDelete = existingIds.filter(id => !newIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from("children").delete().in("id", toDelete);
        }

        // Kinder updaten/hinzufügen
        for (const child of updatedUser.children) {
          if (existingIds.includes(child.id)) {
            // Update
            await supabase
              .from("children")
              .update({
                first_name: child.name,
                group_id: child.group,
                birthday: child.birthday || null,
                notes: child.notes || null,
              })
              .eq("id", child.id);
          } else {
            // Insert
            await supabase
              .from("children")
              .insert({
                id: child.id,
                facility_id: FACILITY_ID,
                user_id: updatedUser.id,
                first_name: child.name,
                group_id: child.group,
                birthday: child.birthday || null,
                notes: child.notes || null,
              });
          }
        }
      }

      // Lokalen State aktualisieren
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setEditingUser(null);
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  const requestDelete = (user) => {
    setConfirmDeleteUser(user);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteUser) return;

    try {
      // Komplette Löschung über SECURITY DEFINER Funktion
      // Löscht: Kinder, Notification Preferences, News Hidden, Profil, Auth User
      const { data, error } = await supabase.rpc("delete_user_completely", {
        p_user_id: confirmDeleteUser.id,
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || "Löschen fehlgeschlagen");
        setConfirmDeleteUser(null);
        return;
      }

      setUsers(prev => prev.filter(u => u.id !== confirmDeleteUser.id));
      setConfirmDeleteUser(null);
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      alert("Fehler beim Löschen: " + err.message);
    }
  };

  const requestReset = (user) => {
    setConfirmResetUser(user);
  };

  const confirmReset = async () => {
    if (!confirmResetUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ must_reset_password: true })
        .eq("id", confirmResetUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === confirmResetUser.id ? { ...u, mustResetPassword: true } : u
      ));

      setConfirmResetUser(null);
      alert("Passwort-Reset aktiviert. Der Benutzer muss beim nächsten Login ein neues Passwort vergeben.");
    } catch (err) {
      console.error("Reset fehlgeschlagen:", err);
      alert("Fehler: " + err.message);
    }
  };

  // Benutzer einer Rolle rendern
  const renderUserSection = (role, sectionTitle, Icon) => {
    const roleUsers = users.filter(u => u.role === role);

    if (roleUsers.length === 0) return null;

    return (
      <div className="space-y-3">
        {/* Sektion Header */}
        <div className="flex items-center gap-2 pt-2">
          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
            <Icon size={14} />
          </div>
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">
            {sectionTitle} ({roleUsers.length})
          </h3>
        </div>

        {/* Benutzer-Karten */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm divide-y divide-stone-100 dark:divide-stone-700">
          {roleUsers.map((u) => {
            const group = u.primaryGroup ? getGroupById(u.primaryGroup) : null;
            const summary = childSummary(u);

            return (
              <div
                key={u.id}
                className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200">
                    <Icon size={18} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-stone-800 dark:text-stone-100">
                        {u.name}
                      </span>
                      {u.mustResetPassword && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Passwort-Reset aktiv
                        </span>
                      )}
                    </div>

                    {group && u.role === "team" && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
                        Stammgruppe:
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                            group.light || "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {group.name}
                        </span>
                      </p>
                    )}

                    {summary && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">{summary}</p>
                    )}
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 pt-1 sm:pt-0">
                  <button
                    onClick={() => openEdit(u)}
                    className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-600 active:scale-95"
                    title="Bearbeiten"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => requestReset(u)}
                    className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95"
                    title="Passwort zurücksetzen"
                  >
                    <KeyRound size={16} />
                  </button>

                  <button
                    onClick={() => requestDelete(u)}
                    className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95"
                    title="Benutzer löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Benutzerverwaltung</h2>

      <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
        Hier verwaltest du alle Profile, Gruppen und Zugänge.
        Du kannst Benutzer bearbeiten, Passwörter zurücksetzen oder Accounts löschen.
      </p>

      {/* Benutzer nach Rolle gruppiert */}
      {renderUserSection("admin", "Leitung", Shield)}
      {renderUserSection("team", "Team", Users)}
      {renderUserSection("parent", "Eltern", User)}

      {/* EDIT-MODAL */}
      {editingUser && (
        <AdminUserModal
          user={editingUser}
          groups={groups}
          onCancel={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {/* DELETE-BESTÄTIGUNG */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={22} />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                Benutzer löschen?
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Soll der Benutzer{" "}
              <span className="font-semibold">
                {confirmDeleteUser.name}
              </span>{" "}
              wirklich gelöscht werden?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET-BESTÄTIGUNG */}
      {confirmResetUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound className="text-amber-500" size={22} />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                Passwort zurücksetzen
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Der Benutzer{" "}
              <span className="font-semibold">
                {confirmResetUser.name}
              </span>{" "}
              muss beim nächsten Login ein neues Passwort vergeben.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmResetUser(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
