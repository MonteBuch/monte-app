// Bündelt alle Module an einer zentralen Stelle, damit App.jsx sauber bleibt.

export { default as NewsFeed } from "./news/NewsFeed";
export { default as FoodPlan } from "./food/FoodPlan";
export { default as GroupArea } from "./group/GroupArea";

// Eltern-Ansicht Abwesenheiten
export { default as AbsenceReport } from "./absence/AbsenceReport";

// Neue Team-/Admin-Ansicht Abwesenheiten (Modul 2)
export { default as AbsenceTeam } from "./absence/AbsenceTeam";
export { default as AbsenceTeamWrapper } from "./absence/AbsenceTeamWrapper";

// Bisheriges Admin-Dashboard (falls du es weiter nutzen möchtest)
export { default as AdminAbsenceDashboard } from "./absence/AdminAbsenceDashboard";

export { default as Settings } from "./settings/Settings";