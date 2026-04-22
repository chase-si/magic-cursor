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

  const prevCursor = root.style.cursor;
  root.style.cursor = "none";

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

  const onMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    schedule();
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
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);

  draw();

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      ro.disconnect();
      canvas.remove();
      teardownLayout();
      root.style.cursor = prevCursor;
    },
  };
}
