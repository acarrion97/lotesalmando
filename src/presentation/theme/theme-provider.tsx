import { createContext, useContext, useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ConfigProvider } from "antd";
import { lightTheme } from "./light-theme";
import { darkTheme } from "./dark-theme";

function subscribeToSystemTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => callback();

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }

  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
}

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "lotesalmando-theme-mode";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return "system";
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredTheme);
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getSystemTheme,
  );

  const isDark = mode === "system" ? systemTheme === "dark" : mode === "dark";

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const themeConfig = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const contextValue = useMemo(
    () => ({ mode, setMode, isDark }),
    [mode, setMode, isDark]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={themeConfig} wave={{ disabled: false }}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
