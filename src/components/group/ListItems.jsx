// src/components/group/ListItems.jsx
import React, { useState, useMemo } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import { supabase } from "../../api/supabaseClient";

/**
 * ListItems:
 * - bring / duty
 * - Eltern: übernehmen, abgeben, hinzufügen (nur bei bring), eigene löschen
 * - Admin: reine Anzeige
 * - Duty-Listen: Datum-basiert, gefiltert, kein Hinzufügen
 * - Supabase WRITE
 */
export default function ListItems({
  list,
  user,
  group,
  isAdmin,
  reload,
}) {
  const [newItem, setNewItem] = useState("");

  // Prüfe ob es eine datierte Duty-Liste ist
  const isDutyList = list.type === "duty";
  const hasDates = list.items?.some((item) => item.date);
  const isDatedDuty = isDutyList && hasDates;

  // Config aus der Liste (für showNext)
  const config = list.config || {};
  const showNext = config.showNext || 0;

  // Filtere und sortiere Items für Duty-Listen
  const displayItems = useMemo(() => {
    if (!list.items) return [];

    if (!isDatedDuty) {
      // Normale Listen: keine Filterung
      return list.items.map((item, idx) => ({ ...item, originalIndex: idx }));
    }

    // Duty-Listen: Filter abgelaufene, sortiere nach Datum
    const today = new Date().toISOString().split("T")[0];

    let filtered = list.items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((item) => !item.date || item.date >= today)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    // Anzeige-Limit
    if (showNext > 0) {
      filtered = filtered.slice(0, showNext);
    }

    return filtered;
  }, [list.items, isDatedDuty, showNext]);

  // Anzahl der ausgeblendeten Items
  const hiddenCount = useMemo(() => {
    if (!isDatedDuty) return 0;
    const today = new Date().toISOString().split("T")[0];
    const futureItems = list.items?.filter(
      (item) => !item.date || item.date >= today
    ).length || 0;
    return Math.max(0, futureItems - displayItems.length);
  }, [list.items, displayItems, isDatedDuty]);

  // Username-Anzeige: zeigt den assignedName wenn vorhanden, sonst Username
  const getDisplayName = (username, assignedName) => {
    if (assignedName) return assignedName;
    return username;
  };

  // ────────────────────────────────────────────────
  //  Supabase: gesamte Items-Liste aktualisieren
  // ────────────────────────────────────────────────
  const updateItems = async (newItems) => {
    const { error } = await supabase
      .from("group_lists")
      .update({ items: newItems })
      .eq("id", list.id);

    if (error) {
      console.error("Fehler beim Aktualisieren der Items:", error);
      alert("Fehler beim Speichern.");
      return;
    }

    reload();
  };

  // ────────────────────────────────────────────────
  //  ÜBERNEHMEN / ABGEBEN
  // ────────────────────────────────────────────────
  const toggleAssign = async (originalIndex) => {
    if (isAdmin) return;

    const items = [...list.items];
    const item = { ...items[originalIndex] };
    const myId = user.id;

    // Kindername des aktuellen Users ermitteln
    const myChildName =
      Array.isArray(user.children) && user.children.length > 0
        ? user.children[0]?.name
        : user.name;

    if (item.assignedTo === myId) {
      // Abgeben
      item.assignedTo = null;
      item.assignedName = null;
    } else {
      // Übernehmen
      item.assignedTo = myId;
      item.assignedName = myChildName;
    }

    items[originalIndex] = item;

    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  NEUES ITEM (nur für bring-Listen)
  // ────────────────────────────────────────────────
  const addCustomItem = async () => {
    if (isAdmin) return;
    if (isDutyList) return; // Keine neuen Items bei Duty-Listen
    if (!newItem.trim()) return;

    const items = [...list.items];

    // Kindername für Anzeige
    const myChildName =
      Array.isArray(user.children) && user.children.length > 0
        ? user.children[0]?.name
        : user.name;

    items.push({
      label: newItem.trim(),
      assignedTo: user.id, // automatisch übernommen
      assignedName: myChildName,
      createdBy: user.id,
    });

    setNewItem("");
    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  ITEM LÖSCHEN (nur eigene, nicht bei Duty)
  // ────────────────────────────────────────────────
  const deleteItem = async (originalIndex) => {
    const item = list.items[originalIndex];

    if (item.createdBy !== user.id) return;
    if (isDutyList) return; // Keine Löschung bei Duty-Listen

    const items = [...list.items];
    items.splice(originalIndex, 1);

    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Duty-Listen Header */}
      {isDatedDuty && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg mb-2">
          <Calendar size={12} />
          <span>Wiederkehrende Termine</span>
        </div>
      )}

      {/* ITEMS */}
      {displayItems.length > 0 ? (
        displayItems.map((item) => {
          const assigned = item.assignedTo;
          const isMine = assigned === user.id;

          const displayName = assigned
            ? isMine
              ? "Du"
              : getDisplayName(assigned, item.assignedName)
            : isAdmin
            ? "—"
            : "Übernehmen";

          return (
            <div
              key={item.originalIndex}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition ${
                assigned
                  ? isMine
                    ? "bg-amber-100 border-amber-200 text-amber-900"
                    : "bg-stone-50 border-stone-200 text-stone-600"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}
            >
              {/* LABEL */}
              <span className="flex-1 font-medium">{item.label}</span>

              {/* RECHTE SEITE */}
              <div className="flex items-center gap-2 text-[10px] text-stone-500">
                {/* Textanzeige: Du / Name des Kindes / nichts bei freien Einträgen */}
                {assigned && <span>{displayName}</span>}

                {/* Eltern – übernehmen (frei) oder abgeben (eigener Eintrag) */}
                {!isAdmin && (!assigned || assigned === user.id) && (
                  <button
                    onClick={() => toggleAssign(item.originalIndex)}
                    className="px-2 py-0.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-[10px] font-bold"
                  >
                    {assigned === user.id ? "Abgeben" : "Eintragen"}
                  </button>
                )}

                {/* Eltern – eigene Items löschen (nur bei bring-Listen) */}
                {!isAdmin &&
                  !isDutyList &&
                  item.createdBy === user.id && (
                    <button
                      onClick={() => deleteItem(item.originalIndex)}
                      className="p-1 bg-red-50 text-red-500 rounded hover:bg-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
              </div>
            </div>
          );
        })
      ) : (
        // Platzhalter für leere Listen
        !isDutyList ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-center">
            <p className="text-sm text-stone-500">Noch keine Einträge vorhanden</p>
            {!isAdmin && (
              <p className="text-xs text-stone-400 mt-1">
                Füge unten den ersten Eintrag hinzu
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-1">Noch keine Einträge.</p>
        )
      )}

      {/* Ausgeblendete Termine Info */}
      {hiddenCount > 0 && (
        <div className="text-xs text-stone-400 text-center py-1">
          + {hiddenCount} weitere Termine
        </div>
      )}

      {/* NEUES ITEM (nur Eltern, nur bei bring-Listen) */}
      {!isAdmin && !isDutyList && (
        <div className="flex items-center gap-2 mt-2">
          <input
            className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            placeholder="Eintrag hinzufügen…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />

          <button
            onClick={addCustomItem}
            className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
