// src/components/food/MealRow.jsx

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { BreakfastIcon, LunchIcon, SnackIcon } from "./MealIcons";

/**
 * One row in the day card.
 * Shows:
 * - Icon (Breakfast / Lunch / Snack)
 * - Label in uppercase, grey
 * - Text or Input (if edit mode)
 * - Allergy note for lunch
 * - LOV-button on the right (edit mode only)
 */

export default function MealRow({
  isAdmin,
  editMode,
  dayKey,
  mealKey,          // "breakfast" | "lunch" | "snack"
  value,            // text content
  allergyNote,      // only for lunch
  onChangeValue,
  onChangeAllergy,
  onOpenLov
}) {

  // ----------------------------------------------
  // Resolve icon + label based on meal type
  // ----------------------------------------------
  let Icon = BreakfastIcon;
  let label = "FRÜHSTÜCK";

  if (mealKey === "lunch") {
    Icon = LunchIcon;
    label = "MITTAGESSEN";
  } else if (mealKey === "snack") {
    Icon = SnackIcon;
    label = "VESPER";
  }

  const showAllergyInput = mealKey === "lunch" && editMode && isAdmin;
  const showAllergyView  = mealKey === "lunch" && !editMode && allergyNote;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-b-0">

      {/* ICON */}
      <div className="pt-1">
        <Icon size={28} />
      </div>

      {/* TEXT AREA */}
      <div className="flex-1">
        {/* LABEL */}
        <p className="text-[10px] font-bold text-stone-500 tracking-[0.14em]">
          {label}
        </p>

        {/* CONTENT */}
        {isAdmin && editMode ? (
          <>
            <input
              value={value}
              onChange={(e) => onChangeValue(dayKey, mealKey, e.target.value)}
              className="mt-1 w-full p-2 rounded-xl bg-[#f9f7f2] border border-stone-200 text-sm"
              placeholder={
                mealKey === "lunch"
                  ? "Gericht eintragen…"
                  : "Eintrag schreiben…"
              }
            />

            {/* ALLERGY INPUT (only lunch) */}
            {showAllergyInput && (
              <input
                value={allergyNote || ""}
                onChange={(e) => onChangeAllergy(dayKey, e.target.value)}
                placeholder="Allergiehinweis (optional)…"
                className="mt-1 w-full p-2 rounded-xl bg-[#f9f7f2] border border-stone-200 text-xs"
              />
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-stone-800">
              {value || <span className="text-stone-400">—</span>}
            </p>

            {showAllergyView && (
              <p className="mt-0.5 text-xs text-stone-500">
                {allergyNote}
              </p>
            )}
          </>
        )}
      </div>

      {/* RIGHT-SIDE LOV BUTTON (only Team/Admin + edit mode) */}
      {isAdmin && editMode && (
        <button
          type="button"
          onClick={() => onOpenLov(mealKey)}
          className="mt-2 w-10 h-9 flex items-center justify-center rounded-xl bg-[#f4f3ef] text-stone-500 hover:bg-stone-200"
        >
          <SlidersHorizontal size={16} />
        </button>
      )}
    </div>
  );
}