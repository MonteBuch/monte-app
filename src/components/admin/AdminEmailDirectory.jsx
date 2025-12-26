// src/components/admin/AdminEmailDirectory.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Users,
  UserCheck,
  UserX,
  Search,
  X,
  Save,
  Link2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { useToast } from "../ui/Toast";
import { getGroupStyles } from "../../utils/groupUtils";

export default function AdminEmailDirectory({ user }) {
  const [groups, setGroups] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [registeredEmails, setRegisteredEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const { showSuccess, showError } = useToast();

  // Modal States
  const [addModal, setAddModal] = useState(null); // group_id oder null
  const [editModal, setEditModal] = useState(null); // entry oder null
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    parent_name: "",
    child_name: "",
    notes: "",
  });

  // Daten laden
  const loadData = useCallback(async () => {
    try {
      // Gruppen laden (ohne Event-Gruppe)
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .eq("is_event_group", false)
        .order("position");

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Alle Gruppen initial aufklappen
      const expanded = {};
      (groupsData || []).forEach(g => { expanded[g.id] = true; });
      setExpandedGroups(expanded);

      // Email-Verzeichnis laden
      const { data: directoryData, error: directoryError } = await supabase
        .from("group_email_directory")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .order("created_at", { ascending: false });

      if (directoryError) throw directoryError;
      setDirectory(directoryData || []);

      // Registrierte Emails laden (aus profiles mit children)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          children (
            id,
            first_name,
            group_id
          )
        `)
        .eq("facility_id", FACILITY_ID)
        .eq("role", "parent");

      if (profilesError) throw profilesError;
      setRegisteredEmails(profilesData || []);

    } catch (err) {
      console.error("Daten laden fehlgeschlagen:", err);
      showError("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle Gruppe auf/zuklappen
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Emails für eine Gruppe zusammenstellen
  const getEmailsForGroup = (groupId) => {
    // Externe Emails aus Verzeichnis
    const externalEmails = directory
      .filter(d => d.group_id === groupId)
      .map(d => ({
        ...d,
        type: "external",
        displayName: d.parent_name || d.email,
      }));

    // Registrierte Emails (Eltern mit Kindern in dieser Gruppe)
    const registeredInGroup = registeredEmails
      .filter(p => p.children?.some(c => c.group_id === groupId))
      .map(p => ({
        id: p.id,
        email: p.email,
        parent_name: p.full_name,
        child_name: p.children
          .filter(c => c.group_id === groupId)
          .map(c => c.first_name)
          .join(", "),
        type: "registered",
        displayName: p.full_name || p.email,
      }));

    return { externalEmails, registeredInGroup };
  };

  // Prüfen ob Email bereits registriert ist
  const isEmailRegistered = (email) => {
    return registeredEmails.some(
      p => p.email?.toLowerCase() === email.toLowerCase()
    );
  };

  // Hinzufügen
  const handleAdd = async () => {
    if (!formData.email || !addModal) return;

    // Prüfen ob Email bereits registriert
    if (isEmailRegistered(formData.email)) {
      showError("Diese Email ist bereits als App-Benutzer registriert");
      return;
    }

    try {
      const { error } = await supabase.from("group_email_directory").insert({
        facility_id: FACILITY_ID,
        group_id: addModal,
        email: formData.email.toLowerCase().trim(),
        parent_name: formData.parent_name || null,
        child_name: formData.child_name || null,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          showError("Diese Email existiert bereits in dieser Gruppe");
        } else {
          throw error;
        }
        return;
      }

      showSuccess("Email hinzugefügt");
      setAddModal(null);
      setFormData({ email: "", parent_name: "", child_name: "", notes: "" });
      loadData();
    } catch (err) {
      console.error("Hinzufügen fehlgeschlagen:", err);
      showError("Email konnte nicht hinzugefügt werden");
    }
  };

  // Bearbeiten
  const handleEdit = async () => {
    if (!editModal) return;

    try {
      const { error } = await supabase
        .from("group_email_directory")
        .update({
          email: formData.email.toLowerCase().trim(),
          parent_name: formData.parent_name || null,
          child_name: formData.child_name || null,
          notes: formData.notes || null,
        })
        .eq("id", editModal.id);

      if (error) throw error;

      showSuccess("Änderungen gespeichert");
      setEditModal(null);
      setFormData({ email: "", parent_name: "", child_name: "", notes: "" });
      loadData();
    } catch (err) {
      console.error("Bearbeiten fehlgeschlagen:", err);
      showError("Änderungen konnten nicht gespeichert werden");
    }
  };

  // Löschen
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from("group_email_directory")
        .delete()
        .eq("id", deleteConfirm.id);

      if (error) throw error;

      showSuccess("Email gelöscht");
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      showError("Email konnte nicht gelöscht werden");
    }
  };

  // Edit Modal öffnen
  const openEditModal = (entry) => {
    setFormData({
      email: entry.email,
      parent_name: entry.parent_name || "",
      child_name: entry.child_name || "",
      notes: entry.notes || "",
    });
    setEditModal(entry);
  };

  // Add Modal öffnen
  const openAddModal = (groupId) => {
    setFormData({ email: "", parent_name: "", child_name: "", notes: "" });
    setAddModal(groupId);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Email-Verzeichnis</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Verwalten Sie Email-Adressen von Eltern, die noch nicht in der App registriert sind.
          Diese erhalten News automatisch per Email.
        </p>
      </div>

      {/* Legende */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-stone-600 dark:text-stone-300">In App registriert</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-stone-600 dark:text-stone-300">Nur Email (extern)</span>
        </div>
      </div>

      {/* Gruppen-Liste */}
      <div className="space-y-3">
        {groups.map((group) => {
          const styles = getGroupStyles(group);
          const { externalEmails, registeredInGroup } = getEmailsForGroup(group.id);
          const totalCount = externalEmails.length + registeredInGroup.length;
          const isExpanded = expandedGroups[group.id];

          return (
            <div
              key={group.id}
              className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
            >
              {/* Gruppen-Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${styles.chipClass}`}>
                    <styles.Icon size={18} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-stone-800 dark:text-stone-100">{styles.name}</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {registeredInGroup.length} registriert, {externalEmails.length} extern
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    {totalCount} {totalCount === 1 ? "Kontakt" : "Kontakte"}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-stone-400" />
                  ) : (
                    <ChevronRight size={20} className="text-stone-400" />
                  )}
                </div>
              </button>

              {/* Gruppen-Inhalt */}
              {isExpanded && (
                <div className="border-t border-stone-100 dark:border-stone-700 p-4 space-y-3">
                  {/* Registrierte Benutzer */}
                  {registeredInGroup.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
                        <UserCheck size={12} className="text-green-500" />
                        Registrierte Eltern
                      </p>
                      {registeredInGroup.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div>
                              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                                {entry.parent_name || entry.email}
                              </p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {entry.email}
                                {entry.child_name && ` • Kind: ${entry.child_name}`}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-100 rounded-lg">
                            App-Nutzer
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Externe Emails */}
                  {externalEmails.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
                        <UserX size={12} className="text-amber-500" />
                        Externe Emails
                      </p>
                      {externalEmails.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <div>
                              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                                {entry.parent_name || entry.email}
                              </p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {entry.email}
                                {entry.child_name && ` • Kind: ${entry.child_name}`}
                              </p>
                              {entry.notes && (
                                <p className="text-xs text-stone-400 dark:text-stone-500 italic mt-1">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                              title="Bearbeiten"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(entry)}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                              title="Löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Keine Kontakte */}
                  {totalCount === 0 && (
                    <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">
                      Keine Kontakte in dieser Gruppe
                    </p>
                  )}

                  {/* Hinzufügen Button */}
                  <button
                    onClick={() => openAddModal(group.id)}
                    className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-600 text-sm font-semibold rounded-xl flex justify-center items-center gap-2 hover:bg-amber-50 transition-colors"
                  >
                    <Plus size={16} />
                    Email hinzufügen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Statistik */}
      <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-700">
        <h3 className="font-semibold text-stone-700 dark:text-stone-200 mb-3">Übersicht</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {registeredEmails.length}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Registriert</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {directory.length}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Extern</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-700 dark:text-stone-200">
              {registeredEmails.length + directory.length}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Gesamt</p>
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-md shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <Mail size={20} className="text-amber-500" />
                Email hinzufügen
              </h3>
              <button
                onClick={() => setAddModal(null)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Email-Adresse *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
                  placeholder="eltern@beispiel.de"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Name des Elternteils
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
                  placeholder="Max Mustermann"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Name des Kindes
                </label>
                <input
                  type="text"
                  value={formData.child_name}
                  onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
                  placeholder="Lisa"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100 resize-none"
                  rows={2}
                  placeholder="Optionale Notizen..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAddModal(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.email}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-md shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <Edit size={20} className="text-amber-500" />
                Email bearbeiten
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Email-Adresse *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Name des Elternteils
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Name des Kindes
                </label>
                <input
                  type="text"
                  value={formData.child_name}
                  onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm dark:text-stone-100 resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEdit}
                disabled={!formData.email}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 w-full max-w-sm shadow-xl border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={22} />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                Email löschen?
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Soll <span className="font-semibold">{deleteConfirm.email}</span> wirklich
              aus dem Verzeichnis entfernt werden?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600"
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
