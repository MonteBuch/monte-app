// src/lib/constants.jsx
import {
  Sprout,
  Sun,
  Flame,
  Droplets,
  Flower2,
  Leaf,
} from "lucide-react";

// Standardcodes (können im Adminbereich überschrieben werden)
export const DEFAULT_PARENT_CODE = "PARENT-2024";
export const DEFAULT_TEAM_CODE = "TEAM-2024";
export const DEFAULT_ADMIN_CODE = "ADMIN-2024";

export const GROUPS = [
  {
    id: "erde",
    name: "Erde",
    color: "bg-[#795C34] text-white",      // Peanut-Braun
    light: "bg-[#F3EADF] text-stone-800",
    icon: <Leaf size={16} />,
  },
  {
    id: "sonne",
    name: "Sonne",
    color: "bg-yellow-500 text-white",
    light: "bg-yellow-50 text-yellow-800",
    icon: <Sun size={16} />,
  },
  {
    id: "feuer",
    name: "Feuer",
    color: "bg-red-500 text-white",
    light: "bg-red-50 text-red-700",
    icon: <Flame size={16} />,
  },
  {
    id: "wasser",
    name: "Wasser",
    color: "bg-blue-500 text-white",
    light: "bg-blue-50 text-blue-700",
    icon: <Droplets size={16} />,
  },
  {
    id: "blume",
    name: "Blume",
    color: "bg-pink-500 text-white",
    light: "bg-pink-50 text-pink-700",
    icon: <Flower2 size={16} />,
  },
];