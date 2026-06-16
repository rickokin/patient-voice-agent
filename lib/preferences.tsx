"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** User-facing display preferences persisted to the browser. */
export interface Preferences {
  /** Show the source transcript title alongside supporting moments in the agent. */
  showTranscriptTitles: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  showTranscriptTitles: true,
};

const STORAGE_KEY = "pva.preferences";

interface PreferencesContextValue {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);

  // Hydrate from localStorage after mount to avoid SSR/client mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        setPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore malformed/unavailable storage; fall back to defaults.
    }
  }, []);

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore write failures (e.g. private mode).
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ preferences, setPreference }),
    [preferences, setPreference],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
