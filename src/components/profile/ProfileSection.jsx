// src/components/profile/ProfileSection.jsx
import React from "react";
import { ChevronRight } from "lucide-react";

export default function ProfileSection({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700 active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-300 rounded-xl shadow-sm">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</p>
          {subtitle && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <ChevronRight className="text-stone-400" size={20} />
    </button>
  );
}