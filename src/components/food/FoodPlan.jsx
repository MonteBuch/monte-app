// src/components/food/FoodPlan.jsx

import React, { useState, useEffect } from "react";
import { Pencil, Check, Utensils } from "lucide-react";
import DayCard from "./DayCard";
import MealSelectionModal from "./MealSelectionModal";
import { StorageService } from "../../lib/storage";

// --------------------------------------------
// WEEKDAY CONSTANTS
// --------------------------------------------
const WEEKDAYS = [
  { key: "monday", label: "Mo" },
  { key: "tuesday", label: "Di" },
  { key: "wednesday", label: "Mi" },
  { key: "thursday", label: "Do" },
  { key: "friday", label: "Fr" },
];

const EMPTY_DAY = {
  breakfast: "",
  lunch: "",
  allergyNote: "",
  snack: "",
};

// --------------------------------------------
// HELPER: Get week range (Mon–Fri)
// --------------------------------------------
function getCurrentWeekRange() {
  const today = new Date();
  const dow = today.getDay(); // 0=So, 1=Mo …

  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = (d) =>
    `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}.`;

  return `${fmt(monday)} – ${fmt(friday)}`;
}

// --------------------------------------------
// MAIN COMPONENT
// --------------------------------------------
export default function FoodPlan({ isAdmin }) {
  const [mealPlan, setMealPlan] = useState({});
  const [lovOptions, setLovOptions] = useState({
    breakfast: [],
    lunch: [],
    snack: [],
  });

  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  // "idle" | "saving" | "saved"
  const [saveState, setSaveState] = useState("idle");

  const [lovOpen, setLovOpen] = useState(false);
  const [lovMealType, setLovMealType] = useState(null);
  const [lovDayKey, setLovDayKey] = useState(null);

  // Load on mount
  useEffect(() => {
    const storedPlan = StorageService.getMealPlan() || {};
    const storedLov =
      StorageService.get("meal_lov") ||
      StorageService.get("lov_options") ||
      {};

    const fullPlan = {};
    WEEKDAYS.forEach(({ key }) => {
      fullPlan[key] = {
        ...EMPTY_DAY,
        ...(storedPlan[key] || {}),
      };
    });

    setMealPlan(fullPlan);

    setLovOptions({
      breakfast: storedLov.breakfast || [],
      lunch: storedLov.lunch || [],
      snack: storedLov.snack || [],
    });
  }, []);

  // ------------------------------------------------
  // UPDATE MEAL VALUES
  // ------------------------------------------------
  const updateMealValue = (dayKey, mealKey, value) => {
    setMealPlan((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [mealKey]: value,
      },
    }));
    setDirty(true);
    setSaveState("idle");
  };

  const updateAllergyNote = (dayKey, value) => {
    setMealPlan((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        allergyNote: value,
      },
    }));
    setDirty(true);
    setSaveState("idle");
  };

  // ------------------------------------------------
  // LOV handlers
  // ------------------------------------------------
  const openLovFor = (dayKey, mealType) => {
    setLovDayKey(dayKey);
    setLovMealType(mealType);
    setLovOpen(true);
  };

  const handleLovSelect = (option) => {
    updateMealValue(lovDayKey, lovMealType, option);
    setLovOpen(false);
  };

  const handleLovAdd = (entry) => {
    setLovOptions((prev) => ({
      ...prev,
      [lovMealType]: [...(prev[lovMealType] || []), entry],
    }));
    setDirty(true);
  };

  const handleLovDelete = (option) => {
    setLovOptions((prev) => ({
      ...prev,
      [lovMealType]: (prev[lovMealType] || []).filter((o) => o !== option),
    }));

    // Remove from meal plan entries
    setMealPlan((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((day) => {
        if (updated[day][lovMealType] === option) {
          updated[day][lovMealType] = "";
        }
      });
      return updated;
    });

    setDirty(true);
  };

  const handleLovReorder = (fromIndex, toIndex) => {
    if (lovMealType == null) return;
    setLovOptions((prev) => {
      const list = [...(prev[lovMealType] || [])];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return {
        ...prev,
        [lovMealType]: list,
      };
    });
    setDirty(true);
  };

  // ------------------------------------------------
  // SAVE (with animation)
  // ------------------------------------------------
  const handleSave = () => {
    if (!dirty) return;

    setSaveState("saving");

    setTimeout(() => {
      StorageService.saveMealPlan(mealPlan);
      StorageService.set("meal_lov", lovOptions);

      setSaveState("saved");

      // Let animation be visible FIRST
      setTimeout(() => {
        setSaveState("idle");
        setDirty(false);
        setEditMode(false);
      }, 1200);

    }, 600);
  };

  const weekRange = getCurrentWeekRange();

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
  return (
    <>
      {/* HEADER */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#f2eee4] px-5 py-4 mb-4 flex items-center gap-3">

        <div className="flex-1">
          <h2 className="text-lg font-bold text-stone-900">Speiseplan</h2>
          <div className="inline-flex mt-2 px-3 py-1 rounded-full bg-stone-100">
            <span className="text-xs text-stone-600">Woche: {weekRange}</span>
          </div>
        </div>

        {/* RIGHT SIDE BUTTONS */}
        {isAdmin && (
          <>
            {saveState === "saving" || saveState === "saved" ? (
              <button
                className={`save-button ${
                  saveState === "saving"
                    ? "save-button--saving"
                    : "save-button--saved"
                }`}
                disabled
              >
                <span className="save-button__content">
                  {saveState === "saving" && (
                    <span className="save-button__spinner" />
                  )}
                  {saveState === "saved" && (
                    <>
                      <Check size={16} />
                      <span>Gespeichert</span>
                    </>
                  )}
                </span>
              </button>
            ) : editMode ? (
              <button
                type="button"
                disabled={!dirty}
                onClick={handleSave}
                className={`save-button save-button--idle ${
                  !dirty ? "save-button--disabled" : ""
                }`}
              >
                <span className="save-button__content">
                  <Utensils size={16} />
                  <span>Speichern</span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditMode(true);
                  setSaveState("idle");
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
              >
                <Pencil size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* DAY CARDS (with animation) */}
      {WEEKDAYS.map((d, i) => (
        <div
          key={d.key}
          className="daycard-anim"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <DayCard
            dayKey={d.key}
            dayLabel={d.label}
            dayData={mealPlan[d.key] || EMPTY_DAY}
            isAdmin={isAdmin}
            editMode={editMode}
            onChangeValue={updateMealValue}
            onChangeAllergy={updateAllergyNote}
            onOpenLov={(mealType) => openLovFor(d.key, mealType)}
          />
        </div>
      ))}

      {/* LOV MODAL */}
      <MealSelectionModal
        open={lovOpen}
        onClose={() => setLovOpen(false)}
        mealLabel={
          lovMealType === "breakfast"
            ? "Frühstück"
            : lovMealType === "lunch"
            ? "Mittagessen"
            : "Vesper"
        }
        options={lovMealType ? lovOptions[lovMealType] || [] : []}
        onSelect={handleLovSelect}
        onAddOption={handleLovAdd}
        onDeleteOption={handleLovDelete}
        onReorderOption={handleLovReorder}
      />
    </>
  );
}