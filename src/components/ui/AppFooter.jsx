// src/components/ui/AppFooter.jsx
import {
  Home,
  Users,
  Utensils,
  CalendarDays,
  User,
  UserCog
} from "lucide-react";

export default function AppFooter({ activeTab, setActiveTab, user }) {
  const tabs = [
    { id: "home", label: "News", icon: Home },
    { id: "group", label: "Gruppe", icon: Users },
    { id: "food", label: "Essen", icon: Utensils },
    { id: "absence", label: "Meldungen", icon: CalendarDays },
  ];

  // Profil / Admin
  if (user.role === "admin") {
    tabs.push({ id: "admin", label: "Admin", icon: UserCog });
  } else {
    tabs.push({ id: "profile", label: "Profil", icon: User });
  }

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0
        bg-white/80 backdrop-blur-md
        border-t border-stone-200
        shadow-[0_-8px_20px_rgba(0,0,0,0.05)]
        h-16 flex items-center justify-center
        z-50
      "
    >
      <div className="max-w-3xl w-full mx-auto flex justify-around px-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex flex-col items-center gap-1 w-16"
            >
              <Icon
                size={22}
                className={`transition ${active ? "text-amber-600" : "text-stone-400"}`}
              />
              <span className={`text-[10px] font-medium ${
                active ? "text-amber-600" : "text-stone-400"
              }`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}