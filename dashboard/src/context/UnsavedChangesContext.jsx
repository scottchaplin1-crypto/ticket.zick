import { createContext, useContext, useEffect, useState, useCallback } from "react";

const UnsavedChangesContext = createContext({ isDirty: false, setDirty: () => {} });

// Tracks whether the page currently has unsaved changes, so navigation (sidebar
// clicks, closing the tab, typing a new URL) can warn before discarding them.
export function UnsavedChangesProvider({ children }) {
  const [isDirty, setIsDirty] = useState(false);
  const setDirty = useCallback((value) => setIsDirty(value), []);

  useEffect(() => {
    function handler(e) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = ""; // required for Chrome to show the native "leave site?" prompt
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

// Call this before any in-app navigation that would abandon unsaved work. Returns
// true if it's safe to proceed (nothing was dirty, or the person confirmed anyway).
export function confirmDiscard(isDirty) {
  if (!isDirty) return true;
  return window.confirm("You have unsaved changes. Leave this page and discard them?");
}
