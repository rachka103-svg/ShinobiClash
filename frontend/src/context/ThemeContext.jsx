import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "sc_theme";

function getInitialTheme() {
  // Light mode has been removed — the cinematic dark "Neon Shadow" palette
  // is the only theme. Ignore any previously stored light preference.
  return "dark";
}

/**
 * ThemeProvider — toggles the `.dark` class on <html>, which flips every
 * CSS variable defined in index.css (brand colors, panel/glass surfaces,
 * shadcn tokens, gold/stroke tokens) from the bright "Ivory & Ink" palette
 * back to the original cinematic dark "Neon Shadow" palette. No
 * component-level theme branching required.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  // Light mode removed — both setters keep the app on the dark theme.
  const setTheme = useCallback(() => setThemeState("dark"), []);
  const toggleTheme = useCallback(() => setThemeState("dark"), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
