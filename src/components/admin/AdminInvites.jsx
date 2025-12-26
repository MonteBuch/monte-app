// src/components/admin/AdminInvites.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Link2,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Clock,
  Users,
  Shield,
  UserPlus,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { useToast } from "../ui/Toast";

const ROLE_LABELS = {
  parent: { label: "Eltern", icon: Users, color: "bg-blue-100 text-blue-700" },
  team: { label: "Team", icon: UserPlus, color: "bg-green-100 text-green-700" },
  admin: { label: "Admin", icon: Shield, color: "bg-amber-100 text-amber-700" },
};

// Token generieren (12 Zeichen, URL-safe)
function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default function AdminInvites({ user }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const { showSuccess, showError } = useToast();

  // Formular für neuen Link
  const [newInvite, setNewInvite] = useState({
    role: "parent",
    label: "",
    expiresIn: "7", // Tage
    maxUses: "1",
  });

  const loadInvites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("invite_links")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (err) {
      console.error("Einladungen laden fehlgeschlagen:", err);
      showError("Einladungen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(newInvite.expiresIn));

      const { error } = await supabase.from("invite_links").insert({
        facility_id: FACILITY_ID,
        token,
        role: newInvite.role,
        label: newInvite.label || null,
        expires_at: expiresAt.toISOString(),
        max_uses: parseInt(newInvite.maxUses),
        created_by: user?.id,
      });

      if (error) throw error;

      showSuccess("Einladungslink erstellt");
      setNewInvite({ role: "parent", label: "", expiresIn: "7", maxUses: "1" });
      loadInvites();
    } catch (err) {
      console.error("Einladung erstellen fehlgeschlagen:", err);
      showError("Einladungslink konnte nicht erstellt werden");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Einladungslink wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("invite_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showSuccess("Einladungslink gelöscht");
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Einladung löschen fehlgeschlagen:", err);
      showError("Einladungslink konnte nicht gelöscht werden");
    }
  };

  const copyLink = async (token) => {
    const url = `${window.location.origin}?invite=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(token);
      showSuccess("Link kopiert!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showError("Link konnte nicht kopiert werden");
    }
  };

  const isExpired = (expiresAt) => new Date(expiresAt) < new Date();
  const isUsedUp = (invite) => invite.use_count >= invite.max_uses;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Einladungslinks</h2>

      {/* Neuen Link erstellen */}
      <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
          <Plus size={18} />
          Neuen Einladungslink erstellen
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Rolle */}
          <div>
            <label className="block text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold mb-1">
              Rolle
            </label>
            <select
              value={newInvite.role}
              onChange={(e) =>
                setNewInvite((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
            >
              <option value="parent">Eltern</option>
              <option value="team">Team</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Gültigkeit */}
          <div>
            <label className="block text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold mb-1">
              Gültig für
            </label>
            <select
              value={newInvite.expiresIn}
              onChange={(e) =>
                setNewInvite((prev) => ({ ...prev, expiresIn: e.target.value }))
              }
              className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
            >
              <option value="1">1 Tag</option>
              <option value="7">7 Tage</option>
              <option value="14">14 Tage</option>
              <option value="30">30 Tage</option>
            </select>
          </div>

          {/* Max. Verwendungen */}
          <div>
            <label className="block text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold mb-1">
              Max.<br />Verwendungen
            </label>
            <select
              value={newInvite.maxUses}
              onChange={(e) =>
                setNewInvite((prev) => ({ ...prev, maxUses: e.target.value }))
              }
              className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
            >
              <option value="1">Einmalig</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
              <option value="25">25x</option>
              <option value="100">100x</option>
            </select>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-xs uppercase text-stone-500 dark:text-stone-400 font-semibold mb-1">
              Beschreibung<br />(optional)
            </label>
            <input
              type="text"
              value={newInvite.label}
              onChange={(e) =>
                setNewInvite((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="z. B. Neue Eltern"
              className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Link2 size={18} />
              Link erstellen
            </>
          )}
        </button>
      </div>

      {/* Bestehende Links */}
      <div className="space-y-3">
        <h3 className="font-semibold text-stone-700 dark:text-stone-200">Aktive Einladungen</h3>

        {invites.length === 0 ? (
          <div className="bg-stone-50 dark:bg-stone-900 p-6 rounded-2xl text-center text-stone-500 dark:text-stone-400 text-sm">
            Keine Einladungslinks vorhanden
          </div>
        ) : (
          invites.map((invite) => {
            const roleConfig = ROLE_LABELS[invite.role];
            const RoleIcon = roleConfig.icon;
            const expired = isExpired(invite.expires_at);
            const usedUp = isUsedUp(invite);
            const inactive = expired || usedUp;

            return (
              <div
                key={invite.id}
                className={`bg-white dark:bg-stone-800 p-4 rounded-2xl border shadow-sm ${
                  inactive
                    ? "border-stone-200 dark:border-stone-700 opacity-60"
                    : "border-stone-200 dark:border-stone-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Rolle Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${roleConfig.color}`}
                      >
                        <RoleIcon size={12} />
                        {roleConfig.label}
                      </span>
                      {invite.label && (
                        <span className="text-sm text-stone-600 dark:text-stone-300">
                          {invite.label}
                        </span>
                      )}
                    </div>

                    {/* Token (gekürzt) */}
                    <code className="text-xs bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded text-stone-600 dark:text-stone-300 font-mono">
                      ...{invite.token.slice(-6)}
                    </code>

                    {/* Status */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-stone-500 dark:text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {expired ? (
                          <span className="text-red-500">Abgelaufen</span>
                        ) : (
                          `Bis ${new Date(invite.expires_at).toLocaleDateString("de-DE")}`
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {invite.use_count}/{invite.max_uses} verwendet
                        {usedUp && (
                          <span className="text-amber-600 ml-1">
                            (aufgebraucht)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!inactive && (
                      <button
                        onClick={() => copyLink(invite.token)}
                        className="p-2 rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 transition-colors"
                        title="Link kopieren"
                      >
                        {copiedId === invite.token ? (
                          <Check size={18} className="text-green-500" />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(invite.id)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
