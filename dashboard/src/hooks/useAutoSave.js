import { useEffect, useRef, useState } from "react";

// Debounced autosave: calls `saveFn` a short pause after `value` stops changing,
// instead of requiring an explicit Save click. `resetKey` (e.g. a selected item's
// id) makes it treat a freshly-loaded item as a clean starting point rather than
// something that was just "changed" by switching to it.
export function useAutoSave(value, saveFn, { delay = 1000, enabled = true, resetKey } = {}) {
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const timerRef = useRef(null);
  const firstRun = useRef(true);
  const prevResetKey = useRef(resetKey);

  useEffect(() => {
    if (resetKey !== prevResetKey.current) {
      prevResetKey.current = resetKey;
      firstRun.current = true;
      setStatus("idle");
    }
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveFn();
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled]);

  return status;
}
