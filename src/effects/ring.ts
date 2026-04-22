import type { Destroyable, RingOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";

/**
 * Canvas 圆环跟随；平滑插值、按下缩放与历史 DOM 版一致。
 */
export function mountRing(
  root: HTMLElement,
  options: RingOptions = {},
): Destroyable {
  const size = options.size ?? 36;
  const color = options.color ?? "rgba(99, 102, 241, 0.9)";
  const borderWidth = options.borderWidth ?? 2;
  const smoothing = options.smoothing ?? 0.18;

  const CURSOR_LOCK_KEY = "magicCursorCursorLocks";
  const PREV_CURSOR_KEY = "magicCursorPrevCursor";
  const acquireCursor = () => {
    const locks = Number(root.dataset[CURSOR_LOCK_KEY] ?? 0) || 0;
    if (locks === 0) {
      root.dataset[PREV_CURSOR_KEY] = root.style.cursor;
      root.style.cursor = "none";
    }
    root.dataset[CURSOR_LOCK_KEY] = String(locks + 1);
  };
  const releaseCursor = () => {
    const locks = Number(root.dataset[CURSOR_LOCK_KEY] ?? 0) || 0;
    const next = Math.max(0, locks - 1);
    if (next === 0) {
      root.style.cursor = root.dataset[PREV_CURSOR_KEY] ?? "";
      delete root.dataset[PREV_CURSOR_KEY];
      delete root.dataset[CURSOR_LOCK_KEY];
    } else {
      root.dataset[CURSOR_LOCK_KEY] = String(next);
    }
  };

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-ring": "",
    "data-magic-cursor-ring-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let pressScale = 1;
  let active = false;

  const draw = () => {
    const bw = canvas.width;
    const bh = canvas.height;
    const dpr = layer.getDpr();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const drawSize = size * pressScale;
    const r = Math.max(0.5, drawSize / 2 - borderWidth / 2);

    ctx.strokeStyle = color;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  const tick = () => {
    raf = 0;
    lx += (targetX - lx) * smoothing;
    ly += (targetY - ly) * smoothing;
    draw();
    if (Math.abs(targetX - lx) > 0.05 || Math.abs(targetY - ly) > 0.05) {
      raf = requestAnimationFrame(tick);
    }
  };

  const schedule = () => {
    if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  };

  const clear = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const onMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    schedule();
  };

  const radius = size / 2;
  const isWithinRingReach = (clientX: number, clientY: number) => {
    const rect = root.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return x >= -radius && x <= rect.width + radius && y >= -radius && y <= rect.height + radius;
  };

  const show = () => {
    if (active) return;
    active = true;
    acquireCursor();
    canvas.style.display = "";
  };
  const hide = () => {
    if (!active) return;
    active = false;
    clear();
    releaseCursor();
    canvas.style.display = "none";
    pressScale = 1;
  };

  const onWindowMove = (e: PointerEvent) => {
    if (isWithinRingReach(e.clientX, e.clientY)) {
      show();
      onMove(e);
    } else {
      hide();
    }
  };
  const onWindowBlur = () => {
    hide();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") {
      hide();
    }
  };

  const onDown = () => {
    pressScale = 0.85;
    draw();
    schedule();
  };
  const onUp = () => {
    pressScale = 1;
    draw();
    schedule();
  };

  lx = root.clientWidth / 2;
  ly = root.clientHeight / 2;
  targetX = lx;
  targetY = ly;

  const ro = observeRootResize(draw);
  root.appendChild(canvas);
  canvas.style.display = "none";
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  window.addEventListener("pointermove", onWindowMove);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  draw();
  // 若挂载时指针已在“ring 可触达范围”内，立即显示
  if (root.matches(":hover")) {
    show();
  }

  return {
    destroy() {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      hide();
      ro.disconnect();
      canvas.remove();
      teardownLayout();
    },
  };
}
