// src/components/ui/MoreMenu.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Home,
  Users,
  UtensilsCrossed,
  CalendarDays,
  Calendar,
  MessageCircle,
  User,
  Settings,
  Sliders,
  GripVertical,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "../../api/supabaseClient";
import { useToast } from "./Toast";

// Tab-Definitionen
const ALL_TABS = {
  news: { id: "news", label: "Pinnwand", icon: Home },
  group: { id: "group", label: "Gruppe", icon: Users },
  food: { id: "food", label: "Essen", icon: UtensilsCrossed },
  absence: { id: "absence", label: "Meldungen", icon: CalendarDays },
  calendar: { id: "calendar", label: "Termine", icon: Calendar },
  chat: { id: "chat", label: "Chat", icon: MessageCircle },
  profile: { id: "profile", label: "Profil", icon: User },
  admin: { id: "admin", label: "Admin", icon: Settings },
};

// Standard-Tab-Konfigurationen pro Rolle
const DEFAULT_TABS = {
  parent: {
    main: ["news", "group", "chat", "absence"],
    more: ["food", "calendar", "profile"],
  },
  team: {
    main: ["news", "group", "absence", "calendar"],
    more: ["food", "profile"],
  },
  admin: {
    main: ["news", "group", "absence", "admin"],
    more: ["food", "calendar", "profile"],
  },
};

// Separates Tab-Item für sauberes Rendering
function TabItem({ tabId, isDragging = false, willBeSwapped = false, dragHandleProps = null }) {
  const tab = ALL_TABS[tabId];
  if (!tab) return null;

  const Icon = tab.icon;

  return (
    <div
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        isDragging
          ? "bg-white shadow-xl border-2 border-amber-500 scale-105"
          : willBeSwapped
          ? "bg-amber-100 border-2 border-amber-400 text-amber-700"
          : "bg-white hover:bg-stone-100 text-stone-700"
      }`}
    >
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600"
        >
          <GripVertical size={16} />
        </div>
      )}
      <div className="relative">
        <Icon size={20} />
      </div>
      <span className="font-medium">{tab.label}</span>
    </div>
  );
}

export default function MoreMenu({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  user,
  badges = {},
}) {
  const [customizeMode, setCustomizeMode] = useState(false);
  const [mainTabs, setMainTabs] = useState([]);
  const [moreTabs, setMoreTabs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Drag State für korrektes Swap-Highlighting
  const [dragInfo, setDragInfo] = useState(null);

  const { showSuccess } = useToast();

  // Animation: Ein- und Ausblenden mit gleicher Geschwindigkeit
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Initiale Tab-Konfiguration laden
  useEffect(() => {
    loadTabPreferences();
  }, [user]);

  const loadTabPreferences = async () => {
    const defaults = DEFAULT_TABS[user.role] || DEFAULT_TABS.parent;

    try {
      const { data, error } = await supabase
        .from("user_tab_preferences")
        .select("main_tabs, more_tabs")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !error) {
        const validMainTabs = (data.main_tabs || []).filter(
          (id) => ALL_TABS[id] && isTabAvailableForRole(id, user.role)
        );
        const validMoreTabs = (data.more_tabs || []).filter(
          (id) => ALL_TABS[id] && isTabAvailableForRole(id, user.role)
        );

        if (validMainTabs.length > 0) {
          setMainTabs(validMainTabs);
          setMoreTabs(validMoreTabs);
          return;
        }
      }
    } catch (err) {
      // Ignorieren - nutze Defaults
    }

    setMainTabs(defaults.main);
    setMoreTabs(defaults.more);
  };

  const isTabAvailableForRole = (tabId, role) => {
    if (tabId === "chat") return role === "parent";
    if (tabId === "admin") return role === "admin";
    if (tabId === "calendar") return role !== "admin";
    return true;
  };

  // Drag Start - speichern welches Element gezogen wird
  const handleDragStart = useCallback((start) => {
    setDragInfo({
      draggableId: start.draggableId,
      sourceDroppableId: start.source.droppableId,
      sourceIndex: start.source.index,
      destinationIndex: null,
      destinationDroppableId: null,
    });
  }, []);

  // Drag Update - tracken wohin gezogen wird
  const handleDragUpdate = useCallback((update) => {
    if (!update.destination) {
      setDragInfo(prev => prev ? { ...prev, destinationIndex: null, destinationDroppableId: null } : null);
      return;
    }

    setDragInfo(prev => prev ? {
      ...prev,
      destinationIndex: update.destination.index,
      destinationDroppableId: update.destination.droppableId,
    } : null);
  }, []);

  // Drag End Handler
  const handleDragEnd = useCallback((result) => {
    setDragInfo(null);

    if (!result.destination) return;

    const { source, destination } = result;

    // Gleiche Liste
    if (source.droppableId === destination.droppableId) {
      const items = source.droppableId === "main" ? [...mainTabs] : [...moreTabs];
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);

      if (source.droppableId === "main") {
        setMainTabs(items);
      } else {
        setMoreTabs(items);
      }
    } else {
      // Zwischen Listen verschieben
      const sourceItems = source.droppableId === "main" ? [...mainTabs] : [...moreTabs];
      const destItems = destination.droppableId === "main" ? [...mainTabs] : [...moreTabs];

      // Max 4 Tabs im Hauptmenü - bei vollem Menü: Tausch durchführen
      if (destination.droppableId === "main" && destItems.length >= 4) {
        const draggedItem = sourceItems[source.index];
        const swapIndex = Math.min(destination.index, destItems.length - 1);
        const swappedItem = destItems[swapIndex];

        sourceItems[source.index] = swappedItem;
        destItems[swapIndex] = draggedItem;

        if (source.droppableId === "main") {
          setMainTabs(sourceItems);
          setMoreTabs(destItems);
        } else {
          setMainTabs(destItems);
          setMoreTabs(sourceItems);
        }
        return;
      }

      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);

      if (source.droppableId === "main") {
        setMainTabs(sourceItems);
        setMoreTabs(destItems);
      } else {
        setMainTabs(destItems);
        setMoreTabs(sourceItems);
      }
    }
  }, [mainTabs, moreTabs]);

  // Speichern
  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("user_tab_preferences").upsert(
        {
          user_id: user.id,
          main_tabs: mainTabs,
          more_tabs: moreTabs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      showSuccess("Menü gespeichert");
      setCustomizeMode(false);
      window.dispatchEvent(new CustomEvent("tabPreferencesChanged"));
    } catch (err) {
      console.error("Menü speichern fehlgeschlagen:", err);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults = DEFAULT_TABS[user.role] || DEFAULT_TABS.parent;
    setMainTabs(defaults.main);
    setMoreTabs(defaults.more);
  };

  // Prüfen ob ein Element getauscht wird (für Highlighting)
  const getSwapIndex = () => {
    if (!dragInfo) return -1;
    if (dragInfo.sourceDroppableId === "more" &&
        dragInfo.destinationDroppableId === "main" &&
        mainTabs.length >= 4 &&
        dragInfo.destinationIndex !== null) {
      return Math.min(dragInfo.destinationIndex, mainTabs.length - 1);
    }
    return -1;
  };

  const swapIndex = getSwapIndex();
  const isDraggingToFullMain = swapIndex >= 0;

  // renderClone für Portal-Rendering des gezogenen Elements
  const renderClone = useCallback((provided, snapshot, rubric) => {
    const tabId = rubric.draggableId;
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={{
          ...provided.draggableProps.style,
        }}
      >
        <TabItem tabId={tabId} isDragging={true} dragHandleProps={null} />
      </div>
    );
  }, []);

  // Tab-Button für normale Ansicht (nicht im Edit Mode)
  const renderNormalTabButton = (tabId) => {
    const tab = ALL_TABS[tabId];
    if (!tab) return null;

    const Icon = tab.icon;
    const badge = badges[tabId];

    return (
      <button
        onClick={() => {
          setActiveTab(tabId);
          onClose();
        }}
        className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors bg-white hover:bg-stone-100 text-stone-700"
      >
        <div className="relative">
          <Icon size={20} />
          {badge && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-3 h-3 flex items-center justify-center">
              {typeof badge === "number" ? (
                <span className="text-[8px]">{badge > 9 ? "9+" : badge}</span>
              ) : (
                badge
              )}
            </div>
          )}
        </div>
        <span className="font-medium">{tab.label}</span>
      </button>
    );
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          animateIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => {
          if (customizeMode) {
            setCustomizeMode(false);
            loadTabPreferences();
          }
          onClose();
        }}
      />

      {/* Slide-in Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          animateIn ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">
            {customizeMode ? "Menü anpassen" : "Mehr"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {customizeMode ? (
            <DragDropContext
              onDragStart={handleDragStart}
              onDragUpdate={handleDragUpdate}
              onDragEnd={handleDragEnd}
            >
              {/* Hauptmenü (max 4 Tabs) */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">
                  Hauptmenü (max. 4)
                  {isDraggingToFullMain && (
                    <span className="ml-2 text-amber-600 normal-case">
                      → Tauscht mit markiertem Element
                    </span>
                  )}
                </p>
                <Droppable
                  droppableId="main"
                  renderClone={renderClone}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[100px] rounded-xl p-2 transition-colors ${
                        snapshot.isDraggingOver && mainTabs.length >= 4
                          ? "bg-amber-50 border-2 border-dashed border-amber-400"
                          : "bg-stone-50"
                      }`}
                    >
                      {mainTabs.map((tabId, index) => {
                        const willBeSwapped = index === swapIndex;
                        return (
                          <Draggable key={tabId} draggableId={tabId} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={provided.draggableProps.style}
                              >
                                <TabItem
                                  tabId={tabId}
                                  isDragging={snapshot.isDragging}
                                  willBeSwapped={willBeSwapped && !snapshot.isDragging}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Mehr-Menü */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">
                  Im "Mehr"-Menü
                </p>
                <Droppable
                  droppableId="more"
                  renderClone={renderClone}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[100px] rounded-xl p-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? "bg-amber-50 border-2 border-dashed border-amber-300"
                          : "bg-stone-50"
                      }`}
                    >
                      {moreTabs.map((tabId, index) => (
                        <Draggable key={tabId} draggableId={tabId} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={provided.draggableProps.style}
                            >
                              <TabItem
                                tabId={tabId}
                                isDragging={snapshot.isDragging}
                                willBeSwapped={false}
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
              </div>

              {/* Aktionen */}
              <div className="space-y-2">
                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? "Speichern..." : "Speichern"}
                </button>
                <button
                  onClick={resetToDefaults}
                  className="w-full py-2 rounded-xl bg-stone-100 text-stone-600 font-semibold text-sm hover:bg-stone-200"
                >
                  Zurücksetzen
                </button>
                <button
                  onClick={() => setCustomizeMode(false)}
                  className="w-full py-2 text-stone-500 text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </DragDropContext>
          ) : (
            <>
              {/* Spacer um Inhalte nach unten zu drücken */}
              <div className="flex-1" />

              {/* Anpassen-Button (oben) */}
              <div className="mb-4">
                <button
                  onClick={() => setCustomizeMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200"
                >
                  <Sliders size={16} />
                  Menü anpassen
                </button>
              </div>

              {/* Trennlinie */}
              <div className="border-t border-stone-200 mb-4" />

              {/* Normale Menü-Ansicht (unten) */}
              <div className="space-y-2">
                {moreTabs.map((tabId) => (
                  <div key={tabId}>{renderNormalTabButton(tabId)}</div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Export für Footer-Nutzung
export { ALL_TABS, DEFAULT_TABS };
