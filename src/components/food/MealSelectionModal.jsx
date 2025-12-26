// src/components/food/MealSelectionModal.jsx

import React, { useState, useEffect } from "react";
import { X, Trash2, Plus } from "lucide-react";

/**
 * Popup modal for selecting meal options (LOV).
 * Now with drag & drop to reorder options.
 */

export default function MealSelectionModal({
  open,
  onClose,
  mealLabel,
  options = [],
  onSelect,
  onAddOption,
  onDeleteOption,
  onReorderOption, // (fromIndex, toIndex)
}) {
  const [newEntry, setNewEntry] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    if (!open) {
      setNewEntry("");
      setDragIndex(null);
      setHoverIndex(null);
    }
  }, [open]);

  if (!open) return null;

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    onReorderOption(dragIndex, index);
    setDragIndex(null);
    setHoverIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-sm bg-white dark:bg-stone-800 rounded-3xl shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
            Auswahl ({mealLabel})
          </h3>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* OPTION LIST */}
        <div className="px-5 py-4 max-h-64 overflow-y-auto space-y-2">
          {options.length === 0 && (
            <p className="text-xs text-stone-400 dark:text-stone-400">
              Noch keine Vorschläge vorhanden.
            </p>
          )}

          {options.map((opt, index) => (
            <div
              key={opt}
              className={`flex items-center justify-between rounded-2xl px-3 py-2 cursor-pointer group
                bg-stone-50 dark:bg-stone-900 hover:bg-amber-50 dark:hover:bg-amber-900/30
                ${hoverIndex === index ? "ring-1 ring-amber-300" : ""}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                if (index !== dragIndex) setHoverIndex(index);
              }}
              onDragLeave={() => setHoverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(index);
              }}
              onClick={() => onSelect(opt)}
            >
              <span className="text-stone-700 dark:text-stone-200 text-sm">
                {opt}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOption(opt);
                }}
                className="p-1 rounded-full text-stone-300 dark:text-stone-600 group-hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* ADD NEW OPTION */}
        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-700 flex items-center gap-2">
          <input
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Neuen Eintrag hinzufügen…"
            className="flex-1 p-2 rounded-2xl border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-sm text-stone-900 dark:text-stone-100"
          />

          <button
            onClick={() => {
              if (!newEntry.trim()) return;
              onAddOption(newEntry.trim());
              setNewEntry("");
            }}
            className="w-9 h-9 rounded-2xl bg-stone-900 dark:bg-stone-600 text-white flex items-center justify-center hover:bg-stone-800 dark:hover:bg-stone-500"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}