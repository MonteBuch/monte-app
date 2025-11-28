// src/components/food/DayCard.jsx

import React from "react";
import MealRow from "./MealRow";

/**
 * One full day card (Mo/Di/Mi/Do/Fr).
 * Contains:
 * - Yellow weekday badge
 * - "TAGESMENÜ" label
 * - Rows for breakfast, lunch, snack
 */

export default function DayCard({
  dayKey,          // "monday", "tuesday", …
  dayLabel,        // "Mo", "Di", …
  dayData,         // { breakfast, lunch, allergyNote, snack }
  isAdmin,
  editMode,
  onChangeValue,
  onChangeAllergy,
  onOpenLov
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#f2eee4] overflow-hidden mb-4">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 py-3">

        {/* Yellow day badge */}
        <div className="flex items-center justify-center w-9 h-9 rounded-2xl
                        bg-gradient-to-br from-[#f8e39c] to-[#f4c665]
                        text-[11px] font-bold text-[#7a5b1b]">
          {dayLabel}
        </div>

        <div>
          <p className="text-[10px] font-bold text-stone-400 tracking-[0.14em]">
            TAGESMENÜ
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-5 pb-4">
        <MealRow
          isAdmin={isAdmin}
          editMode={editMode}
          dayKey={dayKey}
          mealKey="breakfast"
          value={dayData.breakfast}
          allergyNote={null}
          onChangeValue={onChangeValue}
          onChangeAllergy={onChangeAllergy}
          onOpenLov={onOpenLov}
        />

        <MealRow
          isAdmin={isAdmin}
          editMode={editMode}
          dayKey={dayKey}
          mealKey="lunch"
          value={dayData.lunch}
          allergyNote={dayData.allergyNote}
          onChangeValue={onChangeValue}
          onChangeAllergy={onChangeAllergy}
          onOpenLov={onOpenLov}
        />

        <MealRow
          isAdmin={isAdmin}
          editMode={editMode}
          dayKey={dayKey}
          mealKey="snack"
          value={dayData.snack}
          allergyNote={null}
          onChangeValue={onChangeValue}
          onChangeAllergy={onChangeAllergy}
          onOpenLov={onOpenLov}
        />
      </div>
    </div>
  );
}