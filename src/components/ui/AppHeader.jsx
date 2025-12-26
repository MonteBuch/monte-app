// src/components/ui/AppHeader.jsx
import KitaLogo from "./KitaLogo";

export default function AppHeader({ user }) {
  const isTeam = user.role === "team";
  const isAdmin = user.role === "admin";

  return (
    <header className="
      bg-white/90 dark:bg-stone-900/90 backdrop-blur
      border-b border-stone-200 dark:border-stone-700
      px-4 py-3
      sticky top-0 z-40
      flex items-center justify-between
      max-w-3xl mx-auto w-full
    ">
      {/* Logo + Schriftzug */}
      <div className="flex items-center gap-3">
        <KitaLogo size={36} />

        <div className="leading-tight">
          <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
            Montessori Kinderhaus
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {user.username}
          </p>
        </div>
      </div>

      {/* Badge rechts */}
      {(isTeam || isAdmin) && (
        <span className="
          px-3 py-1 rounded-xl bg-black dark:bg-stone-700 text-white text-xs font-semibold
        ">
          {isAdmin ? "Admin" : "Team"}
        </span>
      )}
    </header>
  );
}