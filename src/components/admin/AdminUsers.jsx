// src/components/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { User, Users, Shield, KeyRound, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { StorageService } from "../../lib/storage";
import { GROUPS } from "../../lib/constants";
import AdminUserModal from "./AdminUserModal";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmResetUser, setConfirmResetUser] = useState(null);

  useEffect(() => {
    const all = StorageService.get("users") || [];
    setUsers(all);
  }, []);

  const facility = StorageService.getFacilitySettings();
  const customGroups = facility.groups || [];

  const getGroupById = (id) =>
    customGroups.find((g) => g.id === id) || GROUPS.find((g) => g.id === id);

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

  const persistUsers = (updatedUsers) => {
    setUsers(updatedUsers);
    StorageService.set("users", updatedUsers);
  };

  const openEdit = (user) => {
    setEditingUser(user);
  };

  const handleSaveUser = (updatedUser) => {
    const all = StorageService.get("users") || [];
    const idx = all.findIndex((u) => u.id === updatedUser.id);
    if (idx === -1) return;

    all[idx] = updatedUser;
    persistUsers(all);
    setEditingUser(null);
  };

  const requestDelete = (user) => {
    setConfirmDeleteUser(user);
  };

  const confirmDelete = () => {
    if (!confirmDeleteUser) return;

    const admins = users.filter((u) => u.role === "admin");
    const isLastAdmin =
      confirmDeleteUser.role === "admin" && admins.length <= 1;

    if (isLastAdmin) {
      alert("Es muss mindestens eine Leitung (Admin) bestehen bleiben.");
      setConfirmDeleteUser(null);
      return;
    }

    const remaining = users.filter((u) => u.id !== confirmDeleteUser.id);
    persistUsers(remaining);
    setConfirmDeleteUser(null);
  };

  const requestReset = (user) => {
    setConfirmResetUser(user);
  };

  const confirmReset = () => {
    if (!confirmResetUser) return;

    const all = StorageService.get("users") || [];
    const idx = all.findIndex((u) => u.id === confirmResetUser.id);
    if (idx === -1) {
      setConfirmResetUser(null);
      return;
    }

    const updatedUser = {
      ...all[idx],
      mustResetPassword: true,
    };

    all[idx] = updatedUser;
    persistUsers(all);
    setConfirmResetUser(null);
    alert("Passwort-Reset aktiviert. Der Benutzer muss beim nächsten Login ein neues Passwort vergeben.");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Benutzerverwaltung</h2>

      <p className="text-xs text-stone-500 mb-2">
        Hier verwaltest du alle Profile, Gruppen und Zugänge.  
        Du kannst Benutzer bearbeiten, Passwörter zurücksetzen oder Accounts löschen.
      </p>

      {/* Liste der Benutzer */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
        {users.map((u) => {
          const group = u.primaryGroup ? getGroupById(u.primaryGroup) : null;
          const summary = childSummary(u);

          return (
            <div
              key={u.id}
              className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-stone-100 text-stone-700">
                  {u.role === "admin" ? (
                    <Shield size={18} />
                  ) : u.role === "team" ? (
                    <Users size={18} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-stone-800">
                      {u.name || u.username}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold uppercase tracking-wide">
                      {roleLabel(u.role)}
                    </span>
                    {u.mustResetPassword && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Passwort-Reset aktiv
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-500">
                    Benutzername: <span className="font-mono">{u.username}</span>
                  </p>

                  {group && (u.role === "team" || u.role === "admin") && (
                    <p className="text-xs text-stone-500 flex items-center gap-2">
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
                    <p className="text-xs text-stone-500">{summary}</p>
                  )}
                </div>
              </div>

              {/* Aktionen */}
              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <button
                  onClick={() => openEdit(u)}
                  className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95"
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

        {users.length === 0 && (
          <div className="p-4 text-xs text-stone-500 text-center">
            Noch keine Benutzer angelegt.
          </div>
        )}
      </div>

      {/* EDIT-MODAL */}
      {editingUser && (
        <AdminUserModal
          user={editingUser}
          onCancel={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {/* DELETE-BESTÄTIGUNG */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={22} />
              <h3 className="text-sm font-bold text-stone-800">
                Benutzer löschen?
              </h3>
            </div>
            <p className="text-sm text-stone-600">
              Soll der Benutzer{" "}
              <span className="font-semibold">
                {confirmDeleteUser.name || confirmDeleteUser.username}
              </span>{" "}
              wirklich gelöscht werden?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200"
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
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound className="text-amber-500" size={22} />
              <h3 className="text-sm font-bold text-stone-800">
                Passwort zurücksetzen
              </h3>
            </div>
            <p className="text-sm text-stone-600">
              Der Benutzer{" "}
              <span className="font-semibold">
                {confirmResetUser.name || confirmResetUser.username}
              </span>{" "}
              muss beim nächsten Login ein neues Passwort vergeben.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmResetUser(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200"
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