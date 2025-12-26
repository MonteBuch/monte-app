// src/components/group/GroupChips.jsx
import React from "react";
import { Globe } from "lucide-react";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";

/**
 * GroupChips:
 *
 * - TEAM / ADMIN: Zeigt ALLE Supabase-Gruppen als Chips
 * - ELTERN: Zeigt Kinder als Chips (wie bisher)
 */
export default function GroupChips({
  isAdmin,
  activeGroup,
  setActiveGroup,
  children,
  visibleGroupIds,
  groups, // ✅ kommen jetzt DIREKT aus GroupArea (Supabase)
}) {
  // ───────────────────────────────────────────────────────────────
  // TEAM / ADMIN → ALLE SUPABASE-GRUPPEN
  // ───────────────────────────────────────────────────────────────
  if (isAdmin) {
    const visibleGroups = Array.isArray(groups)
      ? groups.filter((g) => visibleGroupIds?.includes(g.id))
      : [];

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {visibleGroups.map((g) => {
          const isActive = g.id === activeGroup;
          const styles = getGroupStyles(g);

          const color = styles.chipClass || "bg-stone-300";
          const Icon = styles.Icon || Globe;

          return (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition ${
                isActive
                  ? `${color} border-transparent shadow-sm`
                  : "bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
              }`}
            >
              <Icon size={14} />
              <span>{styles.name || "Unbenannt"}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // ELTERN → KINDER ALS CHIPS (Gruppe wird über Supabase gematcht)
  // ───────────────────────────────────────────────────────────────
  if (!isAdmin && children?.length > 1) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {children.map((child) => {
          const group = getGroupById(groups, child.group);
          const styles = getGroupStyles(group);

          const color = styles.chipClass || "bg-stone-300";
          const Icon = styles.Icon || Globe;
          const name = child.name || "Kind";

          const isActive = child.group === activeGroup;

          return (
            <button
              key={child.id}
              onClick={() => setActiveGroup(child.group)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition ${
                isActive
                  ? `${color} border-transparent shadow-sm`
                  : "bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
              }`}
            >
              <Icon size={14} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}