import type { Destroyable, RingOptions } from "../types";

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

  const ring = document.createElement("div");
  ring.setAttribute("data-magic-cursor-ring", "");
  ring.style.cssText = [
    "position:absolute",
    "pointer-events:none",
    "border-radius:50%",
    `width:${size}px`,
    `height:${size}px`,
    `border:${borderWidth}px solid ${color}`,
    "box-sizing:border-box",
    "z-index:2147483000",
    "transform:translate(-50%,-50%) scale(1)",
    "transition:transform 0.12s ease-out",
    "left:0",
    "top:0",
    "will-change:transform,left,top",
  ].join(";");

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;

  const tick = () => {
    raf = 0;
    lx += (targetX - lx) * smoothing;
    ly += (targetY - ly) * smoothing;
    ring.style.left = `${lx}px`;
    ring.style.top = `${ly}px`;
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
    targetX = e.clientX - rect.left + root.scrollLeft;
    targetY = e.clientY - rect.top + root.scrollTop;
    schedule();
  };

  const onDown = () => {
    ring.style.transform = "translate(-50%,-50%) scale(0.85)";
  };
  const onUp = () => {
    ring.style.transform = "translate(-50%,-50%) scale(1)";
  };

  root.appendChild(ring);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);

  const rect0 = root.getBoundingClientRect();
  lx = rect0.width / 2;
  ly = rect0.height / 2;
  targetX = lx;
  targetY = ly;
  ring.style.left = `${lx}px`;
  ring.style.top = `${ly}px`;

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      ring.remove();
      root.style.cursor = prevCursor;
    },
  };
}
