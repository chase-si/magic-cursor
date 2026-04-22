import type { Destroyable, TrailOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";

type TrailPoint = { x: number; y: number; size: number; opacity: number };

/**
 * Canvas 拖尾；pointermove 节流，衰减与历史版本 DOM 实现一致。
 */
export function mountTrail(
  root: HTMLElement,
  options: TrailOptions = {},
): Destroyable {
  const maxDots = options.maxDots ?? 24;
  const color = options.color ?? "rgba(99, 102, 241, 0.65)";
  const size = options.size ?? 6;
  const throttleMs = options.throttleMs ?? 16;

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-trail": "",
    "data-magic-cursor-trail-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  const points: TrailPoint[] = [];
  let last = 0;
  let raf = 0;

  const redraw = () => {
    const bw = canvas.width;
    const bh = canvas.height;
    const dpr = layer.getDpr();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const p of points) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size / 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const flush = () => {
    raf = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      p.opacity *= 0.88;
      p.size = Math.max(2, p.size * 0.96);
      if (p.opacity < 0.04) {
        points.splice(i, 1);
        i--;
      }
    }
    redraw();
    if (points.length) {
      raf = requestAnimationFrame(flush);
    }
  };

  const ensureRaf = () => {
    if (!raf) {
      raf = requestAnimationFrame(flush);
    }
  };

  const onMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - last < throttleMs) {
      return;
    }
    last = now;

    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y, size, opacity: 1 });
    while (points.length > maxDots) {
      points.shift();
    }
    redraw();
    ensureRaf();
  };

  const ro = observeRootResize(redraw);
  root.appendChild(canvas);
  root.addEventListener("pointermove", onMove);

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      ro.disconnect();
      canvas.remove();
      teardownLayout();
    },
  };
}
