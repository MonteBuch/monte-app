// src/components/ui/MoreMenu.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// Keine Layout-Animationen - verhindert Wackeln
const noAnimations = () => false;

// Sortable Tab Item Komponente
function SortableTabItem({ id, willBeSwapped }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id,
    // Deaktiviert alle Layout-Animationen - verhindert Wackeln komplett
    animateLayoutChanges: noAnimations,
  });

  // Einfache Transform ohne Animation
  const style = {
    // Nur Translate verwenden, kein Scale
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    touchAction: "none",
    // Verstecken während des Drags - DragOverlay zeigt das Element
    opacity: isDragging ? 0 : 1,
  };

  const tab = ALL_TABS[id];
  if (!tab) return null;
  const Icon = tab.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-full flex items-center gap-3 p-3 rounded-xl select-none cursor-grab active:cursor-grabbing ${
        willBeSwapped
          ? "bg-amber-100 border-2 border-amber-400 text-amber-700"
          : "bg-white hover:bg-stone-100 text-stone-700"
      }`}
    >
      <div className="text-stone-400">
        <GripVertical size={16} />
      </div>
      <div className="relative">
        <Icon size={20} />
      </div>
      <span className="font-medium">{tab.label}</span>
    </div>
  );
}

// Drag Overlay Item (das sichtbare gezogene Element)
function DragOverlayItem({ id }) {
  const tab = ALL_TABS[id];
  if (!tab) return null;
  const Icon = tab.icon;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl select-none bg-white shadow-xl border-2 border-amber-500 cursor-grabbing"
      style={{ width: "224px" }} // Feste Breite für Portal-Rendering
    >
      <div className="text-stone-400">
        <GripVertical size={16} />
      </div>
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
  const [activeId, setActiveId] = useState(null);
  const [overContainer, setOverContainer] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const { showSuccess } = useToast();

  // Sensoren für @dnd-kit - Touch sofort aktivieren, keine Verzögerung
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 0,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

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
      // Bei Schließen: Edit-Mode beenden
      if (customizeMode) {
        setCustomizeMode(false);
        loadTabPreferences();
      }
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

  // Finde Container und Index für ein Tab
  const findContainer = useCallback(
    (id) => {
      if (mainTabs.includes(id)) return "main";
      if (moreTabs.includes(id)) return "more";
      return null;
    },
    [mainTabs, moreTabs]
  );

  // Drag Start
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  // Drag Over - tracken wohin gezogen wird
  const handleDragOver = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over) {
        setOverContainer(null);
        setOverIndex(null);
        return;
      }

      const activeContainer = findContainer(active.id);
      let overContainerId = findContainer(over.id);

      // Wenn over.id ein Container-ID ist (main/more)
      if (over.id === "main" || over.id === "more") {
        overContainerId = over.id;
      }

      setOverContainer(overContainerId);

      // Index bestimmen
      if (overContainerId === "main") {
        const idx = mainTabs.indexOf(over.id);
        setOverIndex(idx >= 0 ? idx : mainTabs.length - 1);
      } else if (overContainerId === "more") {
        const idx = moreTabs.indexOf(over.id);
        setOverIndex(idx >= 0 ? idx : moreTabs.length);
      }
    },
    [findContainer, mainTabs, moreTabs]
  );

  // Drag End
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;

      setActiveId(null);
      setOverContainer(null);
      setOverIndex(null);

      if (!over) return;

      const activeContainer = findContainer(active.id);
      let overContainer = findContainer(over.id);

      // Wenn über Container selbst gedroppt
      if (over.id === "main" || over.id === "more") {
        overContainer = over.id;
      }

      if (!activeContainer || !overContainer) return;

      // Gleicher Container - Neuordnung
      if (activeContainer === overContainer) {
        const items =
          activeContainer === "main" ? [...mainTabs] : [...moreTabs];
        const oldIndex = items.indexOf(active.id);
        let newIndex = items.indexOf(over.id);

        if (over.id === "main" || over.id === "more") {
          newIndex = items.length - 1;
        }

        if (oldIndex !== newIndex && newIndex >= 0) {
          items.splice(oldIndex, 1);
          items.splice(newIndex, 0, active.id);

          if (activeContainer === "main") {
            setMainTabs(items);
          } else {
            setMoreTabs(items);
          }
        }
      } else {
        // Zwischen Containern verschieben
        const sourceItems =
          activeContainer === "main" ? [...mainTabs] : [...moreTabs];
        const destItems =
          overContainer === "main" ? [...mainTabs] : [...moreTabs];

        const sourceIndex = sourceItems.indexOf(active.id);
        let destIndex = destItems.indexOf(over.id);

        if (over.id === "main" || over.id === "more") {
          destIndex = destItems.length;
        }

        // Max 4 im Hauptmenü - Tausch durchführen
        if (overContainer === "main" && destItems.length >= 4) {
          const swapIdx =
            destIndex >= 0 ? Math.min(destIndex, destItems.length - 1) : destItems.length - 1;
          const swappedItem = destItems[swapIdx];

          // Tausch
          sourceItems[sourceIndex] = swappedItem;
          destItems[swapIdx] = active.id;

          if (activeContainer === "main") {
            setMainTabs(sourceItems);
            setMoreTabs(destItems);
          } else {
            setMainTabs(destItems);
            setMoreTabs(sourceItems);
          }
          return;
        }

        // Normales Verschieben
        sourceItems.splice(sourceIndex, 1);
        if (destIndex < 0) destIndex = destItems.length;
        destItems.splice(destIndex, 0, active.id);

        if (activeContainer === "main") {
          setMainTabs(sourceItems);
          setMoreTabs(destItems);
        } else {
          setMainTabs(destItems);
          setMoreTabs(sourceItems);
        }
      }
    },
    [findContainer, mainTabs, moreTabs]
  );

  // Swap-Index berechnen für Highlighting
  const swapIndex = useMemo(() => {
    if (!activeId || !overContainer) return -1;
    const activeContainer = findContainer(activeId);
    if (
      activeContainer === "more" &&
      overContainer === "main" &&
      mainTabs.length >= 4 &&
      overIndex !== null
    ) {
      return Math.min(overIndex, mainTabs.length - 1);
    }
    return -1;
  }, [activeId, overContainer, overIndex, findContainer, mainTabs]);

  const isDraggingToFullMain = swapIndex >= 0;

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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
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
                <SortableContext
                  items={mainTabs}
                  strategy={verticalListSortingStrategy}
                  id="main"
                >
                  <div
                    className={`space-y-2 min-h-[100px] rounded-xl p-2 ${
                      activeId && overContainer === "main" && mainTabs.length >= 4
                        ? "bg-amber-50 border-2 border-dashed border-amber-400"
                        : "bg-stone-50"
                    }`}
                  >
                    {mainTabs.map((tabId, index) => (
                      <SortableTabItem
                        key={tabId}
                        id={tabId}
                        willBeSwapped={index === swapIndex}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {/* Mehr-Menü */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">
                  Im "Mehr"-Menü
                </p>
                <SortableContext
                  items={moreTabs}
                  strategy={verticalListSortingStrategy}
                  id="more"
                >
                  <div
                    className={`space-y-2 min-h-[100px] rounded-xl p-2 transition-colors ${
                      activeId && overContainer === "more"
                        ? "bg-amber-50 border-2 border-dashed border-amber-300"
                        : "bg-stone-50"
                    }`}
                  >
                    {moreTabs.map((tabId) => (
                      <SortableTabItem key={tabId} id={tabId} willBeSwapped={false} />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {/* Drag Overlay - das sichtbare gezogene Element */}
              <DragOverlay
                zIndex={9999}
                dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}
              >
                {activeId ? <DragOverlayItem id={activeId} /> : null}
              </DragOverlay>

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
            </DndContext>
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
