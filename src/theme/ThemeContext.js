import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "settings_theme"; // "light" | "dark"
const ThemeContext = createContext(null);

const light = {
  mode: "light",
  colors: {
    bg: "#F6F7FB",
    card: "#FFFFFF",
    text: "#0F172A",
    subText: "#64748B",
    border: "#E5E7EB",
    soft: "#F1F5F9",
    darkBtn: "#111827",
    dangerBg: "#FFF1F2",
    dangerBorder: "#FFD5DA",
    primary: "#1F6FEB",
  },
};

const dark = {
  mode: "dark",
  colors: {
    bg: "#0B1220",
    card: "#0F172A",
    text: "#E5E7EB",
    subText: "#94A3B8",
    border: "#1F2937",
    soft: "#111827",
    darkBtn: "#111827",
    dangerBg: "#2A0E14",
    dangerBorder: "#5B1A24",
    primary: "#3B82F6",
  },
};

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") setModeState(saved);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMode = async (next) => {
    if (next !== "light" && next !== "dark") return;
    setModeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const theme = useMemo(() => (mode === "dark" ? dark : light), [mode]);
  const value = useMemo(() => ({ ...theme, setMode, ready }), [theme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeApp() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeApp must be used within ThemeProvider");
  return ctx;
}
