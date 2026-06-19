const CURSOR_LOCK_KEY = "magicCursorCursorLocks";
const PREV_CURSOR_KEY = "magicCursorPrevCursor";

function readLockCount(root: HTMLElement): number {
  return Number(root.dataset[CURSOR_LOCK_KEY] ?? 0) || 0;
}

export function acquireRootCursorLock(root: HTMLElement): () => void {
  const locks = readLockCount(root);
  if (locks === 0) {
    root.dataset[PREV_CURSOR_KEY] = root.style.cursor;
    root.style.cursor = "none";
  }
  root.dataset[CURSOR_LOCK_KEY] = String(locks + 1);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const next = Math.max(0, readLockCount(root) - 1);
    if (next === 0) {
      root.style.cursor = root.dataset[PREV_CURSOR_KEY] ?? "";
      delete root.dataset[PREV_CURSOR_KEY];
      delete root.dataset[CURSOR_LOCK_KEY];
    } else {
      root.dataset[CURSOR_LOCK_KEY] = String(next);
    }
  };
}
