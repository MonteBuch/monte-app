// src/components/profile/ProfileDeleteConfirm.jsx
import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ProfileDeleteConfirm({ user, onCancel, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h3 className="text-stone-800 dark:text-stone-100 font-bold text-lg">
            Profil löschen?
          </h3>
        </div>

        <p className="text-sm text-stone-600 dark:text-stone-300 mb-5">
          Möchtest du dein Profil wirklich löschen?  
          Dieser Vorgang kann <strong>nicht rückgängig</strong> gemacht werden.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold hover:bg-stone-300 dark:hover:bg-stone-600"
          >
            Abbrechen
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}