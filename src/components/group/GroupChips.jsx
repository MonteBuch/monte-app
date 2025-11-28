// src/components/group/GroupChips.jsx
import React from "react";
import { GROUPS } from "../../lib/constants";

/**
 * GroupChips:
 *
 * - TEAM: Zeigt alle Gruppen als Chips
 * - ELTERN: Zeigt Kinder als Chips (mit Gruppe jeweils darin)
 */
export default function GroupChips({
  isAdmin,
  activeGroup,
  setActiveGroup,
  children,
  visibleGroupIds
}) {
  // ───────────────────────────────────────────────────────────────
  // TEAM-ANSICHT
  // ───────────────────────────────────────────────────────────────
  if (isAdmin) {
    const visibleGroups = GROUPS.filter((g) =>
      visibleGroupIds.includes(g.id)
    );

    return (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {visibleGroups.map((g) => {
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? `${g.color} border-transparent shadow-sm`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              {g.icon}
              <span>{g.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // ELTERN-ANSICHT
  // Chips = Kinder (mit Gruppenfarben)
  // ───────────────────────────────────────────────────────────────
  if (!isAdmin && children.length > 1) {
    return (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {children.map((child) => {
          const group = GROUPS.find((g) => g.id === child.group);
          const isActive = child.group === activeGroup;

          return (
            <button
              key={child.id}
              onClick={() => setActiveGroup(child.group)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? `${group.color} border-transparent shadow-sm`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              {group.icon}
              <span>{child.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // ELTERN mit nur einem Kind → keine Chips nötig
  // ───────────────────────────────────────────────────────────────
  return null;
}