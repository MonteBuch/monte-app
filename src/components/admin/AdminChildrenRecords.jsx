// src/components/admin/AdminChildrenRecords.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  Eye,
  Edit,
  UserCircle,
  Cake,
  FileText,
  Users as UsersIcon,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { useToast } from "../ui/Toast";
import { getGroupStyles } from "../../utils/groupUtils";

export default function AdminChildrenRecords({ user, readOnly = false, onBack }) {
  const [groups, setGroups] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const { showSuccess, showError } = useToast();

  // Modal States
  const [viewModal, setViewModal] = useState(null); // child object oder null
  const [editMode, setEditMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    birthday: "",
    notes: "",
    authorized_pickups: "",
  });
  const [saving, setSaving] = useState(false);

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
      (groupsData || []).forEach((g) => {
        expanded[g.id] = true;
      });
      setExpandedGroups(expanded);

      // Alle Kinder laden mit Eltern-Info
      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select(`
          id,
          first_name,
          birthday,
          notes,
          authorized_pickups,
          group_id,
          user_id,
          profiles!children_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq("facility_id", FACILITY_ID)
        .order("first_name");

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);
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
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Kinder für eine Gruppe
  const getChildrenForGroup = (groupId) => {
    return children.filter((c) => c.group_id === groupId);
  };

  // Modal öffnen
  const openChildModal = (child) => {
    setFormData({
      first_name: child.first_name || "",
      birthday: child.birthday || "",
      notes: child.notes || "",
      authorized_pickups: child.authorized_pickups || "",
    });
    setViewModal(child);
    setEditMode(false);
  };

  // Speichern
  const handleSave = async () => {
    if (!viewModal) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          first_name: formData.first_name.trim(),
          birthday: formData.birthday || null,
          notes: formData.notes || null,
          authorized_pickups: formData.authorized_pickups || null,
        })
        .eq("id", viewModal.id);

      if (error) throw error;

      showSuccess("Kinderakte gespeichert");
      setViewModal(null);
      setEditMode(false);
      loadData();
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      showError("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  // Alter berechnen
  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const today = new Date();
    const birth = new Date(birthday);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Geburtstag formatieren
  const formatBirthday = (birthday) => {
    if (!birthday) return "—";
    const date = new Date(birthday);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  const isEditable = !readOnly && user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Zurück-Button (nur wenn onBack vorhanden) */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Zurück</span>
        </button>
      )}

      <div>
        <h2 className="text-lg font-bold text-stone-800">Kinderakten</h2>
        <p className="text-xs text-stone-500 mt-1">
          {isEditable
            ? "Übersicht aller Kinder mit Stammdaten und Abholberechtigungen."
            : "Übersicht aller Kinder (nur Ansicht)."}
        </p>
      </div>

      {/* Statistik */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-amber-600">{children.length}</p>
            <p className="text-xs text-stone-500">Kinder gesamt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-600">{groups.length}</p>
            <p className="text-xs text-stone-500">Gruppen</p>
          </div>
        </div>
      </div>

      {/* Gruppen-Liste */}
      <div className="space-y-3">
        {groups.map((group) => {
          const styles = getGroupStyles(group);
          const groupChildren = getChildrenForGroup(group.id);
          const isExpanded = expandedGroups[group.id];

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
            >
              {/* Gruppen-Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${styles.chipClass}`}>
                    <styles.Icon size={18} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-stone-800">{styles.name}</h3>
                    <p className="text-xs text-stone-500">
                      {groupChildren.length}{" "}
                      {groupChildren.length === 1 ? "Kind" : "Kinder"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-stone-400" />
                  ) : (
                    <ChevronRight size={20} className="text-stone-400" />
                  )}
                </div>
              </button>

              {/* Gruppen-Inhalt */}
              {isExpanded && (
                <div className="border-t border-stone-100 p-4 space-y-2">
                  {groupChildren.length > 0 ? (
                    groupChildren.map((child) => {
                      const age = calculateAge(child.birthday);
                      return (
                        <button
                          key={child.id}
                          onClick={() => openChildModal(child)}
                          className="w-full flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 hover:bg-stone-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                              <UserCircle size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-stone-800">
                                {child.first_name}
                              </p>
                              <p className="text-xs text-stone-500">
                                {age !== null ? `${age} Jahre` : "Alter unbekannt"}
                                {child.profiles?.full_name &&
                                  ` • ${child.profiles.full_name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-1">
                              {child.notes && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                  Hinweise
                                </span>
                              )}
                              {child.authorized_pickups && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                  Abholberechtigte
                                </span>
                              )}
                            </div>
                            {isEditable ? (
                              <Edit size={16} className="text-stone-400" />
                            ) : (
                              <Eye size={16} className="text-stone-400" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-stone-400 text-center py-4">
                      Keine Kinder in dieser Gruppe
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VIEW/EDIT MODAL */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <FileText size={20} className="text-amber-500" />
                Kinderakte
              </h3>
              <button
                onClick={() => {
                  setViewModal(null);
                  setEditMode(false);
                }}
                className="p-1 rounded-lg hover:bg-stone-100"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            {/* Eltern-Info (nur Anzeige) */}
            {viewModal.profiles && (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-1">
                  Elternteil
                </p>
                <p className="text-sm text-stone-800">
                  {viewModal.profiles.full_name || "—"}
                </p>
                <p className="text-xs text-stone-500">
                  {viewModal.profiles.email || "—"}
                </p>
              </div>
            )}

            {/* Gruppen-Info */}
            {viewModal.group_id && (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-1">
                  Gruppe
                </p>
                {(() => {
                  const g = groups.find((gr) => gr.id === viewModal.group_id);
                  const styles = g ? getGroupStyles(g) : null;
                  return styles ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles.chipClass}`}
                    >
                      <styles.Icon size={12} />
                      {styles.name}
                    </span>
                  ) : (
                    <span className="text-sm text-stone-600">—</span>
                  );
                })()}
              </div>
            )}

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Name des Kindes
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                  />
                ) : (
                  <p className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-800">
                    {formData.first_name || "—"}
                  </p>
                )}
              </div>

              {/* Geburtstag */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1 flex items-center gap-1">
                  <Cake size={12} />
                  Geburtstag
                </label>
                {editMode ? (
                  <input
                    type="date"
                    value={formData.birthday || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, birthday: e.target.value })
                    }
                    className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                  />
                ) : (
                  <p className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-800">
                    {formatBirthday(formData.birthday)}
                    {calculateAge(formData.birthday) !== null && (
                      <span className="text-stone-500 ml-2">
                        ({calculateAge(formData.birthday)} Jahre)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Hinweise / Allergien */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">
                  Hinweise / Allergien
                </label>
                {editMode ? (
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm resize-none"
                    rows={3}
                    placeholder="Z.B. Allergien, Besonderheiten..."
                  />
                ) : (
                  <p className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-800 whitespace-pre-wrap">
                    {formData.notes || "—"}
                  </p>
                )}
              </div>

              {/* Abholberechtigte */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1 flex items-center gap-1">
                  <UsersIcon size={12} />
                  Abholberechtigte
                </label>
                {editMode ? (
                  <textarea
                    value={formData.authorized_pickups || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        authorized_pickups: e.target.value,
                      })
                    }
                    className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm resize-none"
                    rows={3}
                    placeholder="Namen der Personen, die das Kind abholen dürfen..."
                  />
                ) : (
                  <p className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-800 whitespace-pre-wrap">
                    {formData.authorized_pickups || "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              {isEditable && !editMode && (
                <>
                  <button
                    onClick={() => {
                      setViewModal(null);
                      setEditMode(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Bearbeiten
                  </button>
                </>
              )}
              {isEditable && editMode && (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.first_name.trim()}
                    className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Speichern
                  </button>
                </>
              )}
              {!isEditable && (
                <button
                  onClick={() => setViewModal(null)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
                >
                  Schließen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
