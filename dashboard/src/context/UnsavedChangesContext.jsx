import { createContext, useContext, useEffect, useState, useCallback } from "react";
import ConfirmDiscardModal from "../components/ConfirmDiscardModal.jsx";

const UnsavedChangesContext = createContext({
  isDirty: false,
  setDirty: () => {},
  requestNavigation: (action) => action(),
});

// Tracks whether the current page has unsaved changes, and — unlike window.confirm,
// which blocks synchronously — routes any navigation attempt through a custom modal
// that resolves asynchronously once the person clicks Cancel or Discard.
export function UnsavedChangesProvider({ children }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
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

  // Runs `action` immediately if nothing's dirty; otherwise holds it until the
  // person confirms via the modal. Pass a function, not the result of calling one.
  const requestNavigation = useCallback(
    (action) => {
      if (!isDirty) {
        action();
        return;
      }
      setPendingAction(() => action);
    },
    [isDirty]
  );

  function confirmLeave() {
    setIsDirty(false);
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }

  function cancelLeave() {
    setPendingAction(null);
  }

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, requestNavigation }}>
      {children}
      {pendingAction && <ConfirmDiscardModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
