// src/components/group/GroupArea.jsx
import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "../../api/supabaseClient";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";
import { useGroups } from "../../context/GroupsContext";
import { fetchListsByGroup, updateListPositions } from "../../api/listApi";

import GroupChips from "./GroupChips";
import ListCard from "./ListCard";
import CreateList from "./CreateList";

export default function GroupArea({ user }) {
  const role = user?.role || "parent";
  const isStaff = role === "team" || role === "admin";
  const isAdminView = isStaff;

  const realChildren = Array.isArray(user.children) ? user.children : [];

  // ───────────────────────────────────────────────────────────────
  // GRUPPEN (aus zentralem Context - bereits geladen, mit Realtime)
  // ───────────────────────────────────────────────────────────────
  const { groups } = useGroups();

  // ───────────────────────────────────────────────────────────────
  // EVENT: gibt es irgendeine Liste in der Eventgruppe?
  // ───────────────────────────────────────────────────────────────
  const [hasEventLists, setHasEventLists] = useState(false);

  useEffect(() => {
    async function checkEventLists() {
      const eventGroup = groups.find((g) => g.is_event_group);
      if (!eventGroup) {
        setHasEventLists(false);
        return;
      }

      try {
        const data = await fetchListsByGroup(eventGroup.id);
        setHasEventLists(Array.isArray(data) && data.length > 0);
      } catch {
        setHasEventLists(false);
      }
    }

    if (groups.length) checkEventLists();
  }, [groups]);

  // ───────────────────────────────────────────────────────────────
  // AKTIVE GRUPPE
  // ───────────────────────────────────────────────────────────────
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    if (!groups.length || activeGroup) return;

    // STAFF: primaryGroup oder erste Gruppe
    if (isStaff) {
      const initial =
        user?.primaryGroup || groups[0]?.id || groups[0]?.name || null;
      if (initial) setActiveGroup(initial);
      return;
    }

    // ELTERN: erste Kindergruppe (auf Supabase gemappt)
    if (!isStaff && realChildren.length > 0) {
      const firstChild = realChildren[0];
      const supa = groups.find(
        (g) =>
          g.id === firstChild.group ||
          g.name?.toLowerCase() === firstChild.group?.toLowerCase()
      );
      const initial = supa?.id || firstChild.group;
      if (initial) setActiveGroup(initial);
      return;
    }

    // Fallback
    if (groups[0]?.id) {
      setActiveGroup(groups[0].id);
    }
  }, [groups, isStaff, realChildren, user?.primaryGroup, activeGroup]);

  // ───────────────────────────────────────────────────────────────
  // LISTEN (Supabase, gruppenbasiert)
  // ───────────────────────────────────────────────────────────────
  const [lists, setLists] = useState([]);

  const loadLists = async () => {
    if (!activeGroup) return;
    try {
      const data = await fetchListsByGroup(activeGroup);
      setLists(data || []);
    } catch {
      setLists([]);
    }
  };

  // ───────────────────────────────────────────────────────────────
  // DRAG & DROP HANDLER
  // ───────────────────────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    // Reorder lists locally
    const reordered = Array.from(lists);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // Update local state immediately for responsiveness
    setLists(reordered);

    // Prepare position updates
    const updates = reordered.map((list, index) => ({
      id: list.id,
      position: index,
    }));

    // Save to database
    try {
      await updateListPositions(updates);
    } catch (error) {
      console.error("Fehler beim Speichern der Reihenfolge:", error);
      // Reload original order on error
      loadLists();
    }
  };

  useEffect(() => {
    loadLists();

    // Realtime Subscription für Listen-Änderungen der aktiven Gruppe
    if (!activeGroup) return;

    const channel = supabase
      .channel(`lists-${activeGroup}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_lists",
          filter: `group_id=eq.${activeGroup}`,
        },
        (payload) => {
          console.log("Lists Realtime: INSERT");
          // Prüfe auf Duplikate bevor hinzugefügt wird
          setLists((prev) => {
            if (prev.some((l) => l.id === payload.new.id)) {
              return prev; // Bereits vorhanden
            }
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_lists",
          filter: `group_id=eq.${activeGroup}`,
        },
        (payload) => {
          console.log("Lists Realtime: UPDATE");
          setLists((prev) =>
            prev.map((l) => (l.id === payload.new.id ? payload.new : l))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_lists",
          filter: `group_id=eq.${activeGroup}`,
        },
        (payload) => {
          console.log("Lists Realtime: DELETE");
          setLists((prev) => prev.filter((l) => l.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  // ───────────────────────────────────────────────────────────────
  // KINDER-SICHT (Eltern) inkl. optionalem Event-Chip
  // ───────────────────────────────────────────────────────────────
  const children = useMemo(() => {
    if (isStaff) return realChildren;

    // Kindergruppen auf Supabase-Gruppen-IDs mappen
    let base = realChildren.map((child) => {
      const supa = groups.find(
        (g) =>
          g.id === child.group ||
          g.name?.toLowerCase() === child.group?.toLowerCase()
      );

      return {
        ...child,
        group: supa?.id || child.group,
      };
    });

    // Eventchip nur, wenn es Eventlisten gibt
    if (hasEventLists) {
      const eventGroup = groups.find((g) => g.is_event_group);
      if (eventGroup) {
        base = [
          {
            id: "__event__",
            name: "Event",
            group: eventGroup.id,
          },
          ...base,
        ];
      }
    }

    return base;
  }, [realChildren, groups, hasEventLists, isStaff]);

  // ───────────────────────────────────────────────────────────────
  // SICHTBARE GRUPPEN FÜR CHIPS
  // ───────────────────────────────────────────────────────────────
  const visibleGroupIds = isStaff
    ? groups.map((g) => g.id)
    : [...new Set(children.map((c) => c.group))];

  const childrenView = !isStaff && children.length > 1;

  // ───────────────────────────────────────────────────────────────
  // AKTUELLE GRUPPE (für Header/Styles)
  // ───────────────────────────────────────────────────────────────
  const currentGroupRaw = useMemo(() => {
    let grp =
      groups.find((g) => g.id === activeGroup) ||
      groups.find((g) => g.name === activeGroup) ||
      groups.find((g) =>
        g.name?.toLowerCase().includes(activeGroup?.toLowerCase())
      );

    if (grp) return grp;

    const child = children.find(
      (c) => c.group === activeGroup || c.name === activeGroup
    );

    if (child) {
      const byId = getGroupById(groups, child.group);
      if (byId) return byId;

      const byName = groups.find((g) => g.name === child.group);
      if (byName) return byName;
    }

    return {
      id: "fallback-cloud",
      name: "Wolke",
      color: "bg-cyan-500",
      icon: "cloud",
    };
  }, [groups, activeGroup, children]);

  const currentGroup = useMemo(
    () => getGroupStyles(currentGroupRaw),
    [currentGroupRaw]
  );

  // ───────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* HEADER-KARTE */}
      <div
        className="p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3"
        style={{ backgroundColor: currentGroup.headerColor }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`${currentGroup.chipClass} p-2 rounded-2xl text-white shadow`}
            >
              <currentGroup.Icon size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-800">
                Gruppenbereich
              </h2>
              <p className="text-xs text-stone-600">
                {childrenView
                  ? "Übersicht zu allen Listen"
                  : `Gruppe ${currentGroup.name}`}
              </p>
            </div>
          </div>
        </div>

        <GroupChips
          isAdmin={isAdminView}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          children={children}
          visibleGroupIds={visibleGroupIds}
          groups={groups}
        />
      </div>

      {/* NEUE LISTE BUTTON - oben für Team/Admin */}
      {isStaff && (
        <CreateList activeGroup={activeGroup} groupName={currentGroup.name} reload={loadLists} />
      )}

      {/* LISTEN mit Drag & Drop für Staff */}
      {lists.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 text-center text-stone-500 text-sm">
          Für diese Gruppe sind noch keine Listen angelegt.
        </div>
      ) : isStaff ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lists">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3"
              >
                {lists.map((list, index) => (
                  <Draggable key={list.id} draggableId={list.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? "z-50 opacity-90" : ""}
                      >
                        <ListCard
                          list={list}
                          user={user}
                          group={currentGroup}
                          isAdmin={isAdminView}
                          reload={loadLists}
                          dragHandleProps={provided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              user={user}
              group={currentGroup}
              isAdmin={isAdminView}
              reload={loadLists}
            />
          ))}
        </div>
      )}
    </div>
  );
}