// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";

const ThemeContext = createContext({
  theme: "light",
  effectiveTheme: "light",
  setTheme: () => {},
  isLoading: true,
});

export function ThemeProvider({ children, userId }) {
  const [theme, setThemeState] = useState("light"); // light, dark, system
  const [isLoading, setIsLoading] = useState(true);

  // Effektives Theme basierend auf Einstellung und System-Präferenz
  const getEffectiveTheme = (themeSetting) => {
    if (themeSetting === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return themeSetting;
  };

  const [effectiveTheme, setEffectiveTheme] = useState(() =>
    getEffectiveTheme("light")
  );

  // Theme-Präferenz aus DB laden
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function loadTheme() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("theme_preference")
          .eq("id", userId)
          .single();

        if (data && !error && data.theme_preference) {
          setThemeState(data.theme_preference);
          setEffectiveTheme(getEffectiveTheme(data.theme_preference));
        }
      } catch (err) {
        console.error("Theme laden fehlgeschlagen:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTheme();
  }, [userId]);

  // System-Präferenz-Listener
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setEffectiveTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Dark-Class auf HTML-Element anwenden
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [effectiveTheme]);

  // Theme ändern und in DB speichern
  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    setEffectiveTheme(getEffectiveTheme(newTheme));

    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ theme_preference: newTheme })
          .eq("id", userId);
      } catch (err) {
        console.error("Theme speichern fehlgeschlagen:", err);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, effectiveTheme, setTheme, isLoading }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
