import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "auto";

interface ThemeContextType {
  pref: ThemePref;
  setTheme: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pref, setPref] = useState<ThemePref>(() => {
    const saved = localStorage.getItem("healty_theme_pref");
    const valid = saved === "light" || saved === "dark" || saved === "auto";
    const resolved: ThemePref = valid ? (saved as ThemePref) : "auto";

    // Apply synchronously to avoid flash of wrong theme on first paint
    if (resolved === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", resolved);
    }

    return resolved;
  });

  useEffect(() => {
    if (pref === "auto") {
      // Remove explicit override — CSS @media prefers-color-scheme handles the switch
      document.documentElement.removeAttribute("data-theme");

      // Listener is registered solely to trigger cleanup when pref changes away from "auto".
      // CSS updates visually without any JS involvement; the listener itself is a no-op.
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const noop = () => {};
      mq.addEventListener("change", noop);
      return () => mq.removeEventListener("change", noop);
    } else {
      // Force explicit theme. System changes are ignored:
      // • The @media rule won't apply (html:not([data-theme="light"]) guard)
      // • No matchMedia listener is registered
      document.documentElement.setAttribute("data-theme", pref);
    }
  }, [pref]);

  const setTheme = (newPref: ThemePref) => {
    setPref(newPref);
    localStorage.setItem("healty_theme_pref", newPref);
  };

  return (
    <ThemeContext.Provider value={{ pref, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
