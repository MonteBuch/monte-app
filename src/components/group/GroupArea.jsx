import React, { useEffect, useState, useMemo } from "react";
import { Users } from "lucide-react";
import { StorageService } from "../../lib/storage";
import { GROUPS } from "../../lib/constants";

import GroupChips from "./GroupChips";
import ListCard from "./ListCard";
import CreateList from "./CreateList";

export default function GroupArea({ user }) {
  const role = user?.role || "parent";
  const isStaff = role === "team" || role === "admin"; // Team + Leitung
  const isAdminView = isStaff; // für den bisherigen Header-Text "Team"

  const children = Array.isArray(user.children) ? user.children : [];

  // aktive Gruppe
  const [activeGroup, setActiveGroup] = useState(() => {
    if (isStaff) {
      return user.primaryGroup || "erde";
    }
    if (children.length > 0 && children[0].group) {
      return children[0].group;
    }
    return "erde";
  });

  const [lists, setLists] = useState([]);

  // Sichtbare Gruppen-IDs
  const visibleGroupIds = isStaff
    ? GROUPS.map((g) => g.id)
    : [...new Set(children.map((c) => c.group))];

  // Eltern mit mehreren Kindern → Kindertabs
  const childrenView = !isStaff && children.length > 1;

  // Eltern: beim Mount aktive Gruppe auf erstes Kind setzen
  useEffect(() => {
    if (!isStaff && children.length > 0 && children[0].group) {
      setActiveGroup(children[0].group);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  const loadLists = () => {
    const all = StorageService.get("grouplists") || [];
    const filtered = all.filter((l) => l.groupId === activeGroup);

    filtered.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    setLists(filtered);
  };

  const currentGroup = useMemo(
    () => GROUPS.find((g) => g.id === activeGroup) || GROUPS[0],
    [activeGroup]
  );

  return (
    <div className="space-y-5">
      {/* HEADER-KARTE */}
      <div
        className={`p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3 ${currentGroup.light}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`${currentGroup.color} p-2 rounded-2xl text-white shadow`}
            >
              {currentGroup.icon}
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-800">
                Gruppenbereich
              </h2>
              <p className="text-xs text-stone-600">
                {childrenView
                  ? "Übersicht zu allen Kindern"
                  : `Gruppe ${currentGroup.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-stone-600">
            <Users size={16} />
            <span>{isAdminView ? "Team" : "Eltern"}</span>
          </div>
        </div>

        {/* CHIPS: für Team Gruppen, für Eltern Kinder */}
        <GroupChips
          isAdmin={isAdminView}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          children={children}
          visibleGroupIds={visibleGroupIds}
        />
      </div>

      {/* LISTEN-ÜBERSICHT */}
      <div className="space-y-3">
        {lists.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 text-center text-stone-500 text-sm">
            Für diese Gruppe sind noch keine Listen angelegt.
          </div>
        ) : (
          lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              user={user}
              group={currentGroup}
              isAdmin={isAdminView}
              reload={loadLists}
            />
          ))
        )}
      </div>

      {/* TEAM/LEITUNG: Liste anlegen */}
      {isStaff && (
        <CreateList activeGroup={activeGroup} reload={loadLists} />
      )}
    </div>
  );
}