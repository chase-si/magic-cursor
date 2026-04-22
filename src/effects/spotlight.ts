import type { Destroyable, SpotlightOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";

/**
 * Canvas 叠加层；pointermove 经 rAF 合并，每帧最多绘制一次。
 */
export function mountSpotlight(
  root: HTMLElement,
  options: SpotlightOptions = {},
): Destroyable {
  const radius = options.radius ?? 140;
  const dimColor = options.dimColor ?? "rgba(0, 0, 0, 0.82)";

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-spotlight": "",
    "data-magic-cursor-spotlight-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;
  let lastX = root.clientWidth / 2;
  let lastY = root.clientHeight / 2;

  const draw = (x: number, y: number) => {
    lastX = x;
    lastY = y;
    const bw = canvas.width;
    const bh = canvas.height;
    const cw = root.clientWidth;
    const ch = root.clientHeight;
    const dpr = layer.getDpr();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = dimColor;
    ctx.fillRect(0, 0, cw, ch);

    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.65, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = "source-over";
  };

  const ro = observeRootResize(() => draw(lastX, lastY));

  let raf = 0;
  let moveClientX = 0;
  let moveClientY = 0;
  let dirty = false;

  const flushMove = () => {
    raf = 0;
    if (!dirty) {
      return;
    }
    dirty = false;
    const rect = root.getBoundingClientRect();
    const x = moveClientX - rect.left;
    const y = moveClientY - rect.top;
    draw(x, y);
  };

  const onMove = (e: PointerEvent) => {
    moveClientX = e.clientX;
    moveClientY = e.clientY;
    dirty = true;
    if (!raf) {
      raf = requestAnimationFrame(flushMove);
    }
  };

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
