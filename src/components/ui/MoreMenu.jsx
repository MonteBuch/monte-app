// src/components/ui/MoreMenu.jsx
import React, { useState, useEffect } from "react";
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
  Menu,
  Sliders,
  Cake,
  GripVertical,
  Check,
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
  const { showSuccess } = useToast();

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
        .single();

      if (data && !error) {
        // Validiere dass alle Tabs noch existieren und der Rolle entsprechen
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

    // Defaults setzen
    setMainTabs(defaults.main);
    setMoreTabs(defaults.more);
  };

  // Prüfen ob Tab für Rolle verfügbar ist
  const isTabAvailableForRole = (tabId, role) => {
    if (tabId === "chat") return role === "parent";
    if (tabId === "admin") return role === "admin";
    if (tabId === "calendar") return role !== "admin"; // Admin hat es im Admin-Bereich
    return true;
  };

  // Drag & Drop Handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Gleiche Liste
    if (source.droppableId === destination.droppableId) {
      const items =
        source.droppableId === "main" ? [...mainTabs] : [...moreTabs];
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

      // Max 4 Tabs im Hauptmenü (5. ist "Mehr")
      if (destination.droppableId === "main" && destItems.length >= 4) {
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
  };

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

      // Event für Footer-Update auslösen
      window.dispatchEvent(new CustomEvent("tabPreferencesChanged"));
    } catch (err) {
      console.error("Menü speichern fehlgeschlagen:", err);
    } finally {
      setSaving(false);
    }
  };

  // Reset zu Defaults
  const resetToDefaults = () => {
    const defaults = DEFAULT_TABS[user.role] || DEFAULT_TABS.parent;
    setMainTabs(defaults.main);
    setMoreTabs(defaults.more);
  };

  // Tab-Button im Menü
  const renderTabButton = (tabId, provided = null, isDragging = false) => {
    const tab = ALL_TABS[tabId];
    if (!tab) return null;

    const Icon = tab.icon;
    const isActive = activeTab === tabId;
    const badge = badges[tabId];

    const content = (
      <button
        onClick={() => {
          if (!customizeMode) {
            setActiveTab(tabId);
            onClose();
          }
        }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
          isActive
            ? "bg-amber-100 text-amber-700"
            : "hover:bg-stone-100 text-stone-700"
        } ${isDragging ? "shadow-lg bg-white" : ""}`}
        disabled={customizeMode}
      >
        {customizeMode && provided && (
          <div
            {...provided.dragHandleProps}
            className="cursor-grab text-stone-400 hover:text-stone-600"
          >
            <GripVertical size={16} />
          </div>
        )}
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
        {isActive && !customizeMode && (
          <Check size={16} className="ml-auto text-amber-600" />
        )}
      </button>
    );

    if (provided) {
      return (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
        >
          {content}
        </div>
      );
    }

    return content;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Slide-in Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
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
        <div className="flex-1 overflow-y-auto p-4">
          {customizeMode ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              {/* Hauptmenü (max 4 Tabs) */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">
                  Hauptmenü (max. 4)
                </p>
                <Droppable droppableId="main">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 min-h-[100px] bg-stone-50 rounded-xl p-2"
                    >
                      {mainTabs.map((tabId, index) => (
                        <Draggable key={tabId} draggableId={tabId} index={index}>
                          {(provided, snapshot) =>
                            renderTabButton(tabId, provided, snapshot.isDragging)
                          }
                        </Draggable>
                      ))}
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
                <Droppable droppableId="more">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 min-h-[100px] bg-stone-50 rounded-xl p-2"
                    >
                      {moreTabs.map((tabId, index) => (
                        <Draggable key={tabId} draggableId={tabId} index={index}>
                          {(provided, snapshot) =>
                            renderTabButton(tabId, provided, snapshot.isDragging)
                          }
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
              {/* Normale Menü-Ansicht */}
              <div className="space-y-2">
                {moreTabs.map((tabId) => (
                  <div key={tabId}>{renderTabButton(tabId)}</div>
                ))}
              </div>

              {/* Anpassen-Button */}
              <div className="mt-6 pt-4 border-t border-stone-200">
                <button
                  onClick={() => setCustomizeMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200"
                >
                  <Sliders size={16} />
                  Menü anpassen
                </button>
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
