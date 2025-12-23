// src/components/profile/ProfileCustomize.jsx
import React from "react";
import { ArrowLeft, Sun, Moon, Monitor, Sparkles } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const THEME_OPTIONS = [
  {
    id: "light",
    label: "Hell",
    icon: Sun,
    description: "Helles Design für optimale Lesbarkeit bei Tag",
  },
  {
    id: "dark",
    label: "Dunkel",
    icon: Moon,
    description: "Dunkles Design, schonend für die Augen bei wenig Licht",
  },
  {
    id: "system",
    label: "Automatisch",
    icon: Monitor,
    description: "Passt sich automatisch an dein Gerät an",
  },
];

export default function ProfileCustomize({ user, onBack, onShowWelcome }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        className="flex items-center text-stone-500 dark:text-stone-400 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
        Anpassungen
      </h2>

      {/* Theme Selection */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-700">
          <h3 className="font-semibold text-stone-800 dark:text-stone-100">
            Erscheinungsbild
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Wähle zwischen hellem und dunklem Design
          </p>
        </div>

        <div className="p-4 space-y-2">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${
                  isSelected
                    ? "bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-500"
                    : "bg-stone-50 dark:bg-stone-700 border-2 border-transparent hover:bg-stone-100 dark:hover:bg-stone-600"
                }`}
              >
                <div
                  className={`p-2 rounded-xl ${
                    isSelected
                      ? "bg-amber-500 text-white"
                      : "bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300"
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="text-left flex-1">
                  <p
                    className={`font-semibold ${
                      isSelected
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Welcome Screen Trigger */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-700">
          <h3 className="font-semibold text-stone-800 dark:text-stone-100">
            Einführung
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Zeige die Willkommens-Tour erneut an
          </p>
        </div>

        <div className="p-4">
          <button
            onClick={onShowWelcome}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
          >
            <Sparkles size={18} />
            Willkommens-Tour starten
          </button>
        </div>
      </div>
    </div>
  );
}
