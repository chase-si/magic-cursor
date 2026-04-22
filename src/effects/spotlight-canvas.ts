import type { Destroyable, SpotlightOptions } from "../types";

const MAX_DPR = 2;

/**
 * Canvas 叠加层；pointermove 经 rAF 合并，每帧最多绘制一次。
 */
export function mountSpotlightCanvas(
  root: HTMLElement,
  options: SpotlightOptions = {},
): Destroyable {
  const radius = options.radius ?? 140;
  const dimColor = options.dimColor ?? "rgba(0, 0, 0, 0.82)";

  const prevPosition = root.style.position;
  const computed = getComputedStyle(root);
  if (computed.position === "static") {
    root.style.position = "relative";
  }

  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-magic-cursor-spotlight", "");
  canvas.setAttribute("data-magic-cursor-spotlight-renderer", "canvas");
  canvas.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:2147483000",
    "border-radius:inherit",
  ].join(";");

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("magic-cursor spotlight: 2D canvas context unavailable");
  }

  let dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, MAX_DPR);
  let lastX = root.clientWidth / 2;
  let lastY = root.clientHeight / 2;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = root.clientWidth;
    const h = root.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  };

  const draw = (x: number, y: number) => {
    lastX = x;
    lastY = y;
    const bw = canvas.width;
    const bh = canvas.height;
    const cw = root.clientWidth;
    const ch = root.clientHeight;

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

  const ro = new ResizeObserver(() => {
    resize();
    draw(lastX, lastY);
  });
  ro.observe(root);
  resize();
  draw(lastX, lastY);

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
      if (computed.position === "static") {
        root.style.position = prevPosition;
      }
    },
  };
}
