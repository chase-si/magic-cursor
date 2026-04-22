import type { Destroyable, TrailOptions } from "../types";

export function mountTrail(
  root: HTMLElement,
  options: TrailOptions = {},
): Destroyable {
  const maxDots = options.maxDots ?? 24;
  const color = options.color ?? "rgba(99, 102, 241, 0.65)";
  const size = options.size ?? 6;
  const throttleMs = options.throttleMs ?? 16;

  const dots: HTMLDivElement[] = [];
  let last = 0;
  let raf = 0;

  const flush = () => {
    raf = 0;
    for (let i = 0; i < dots.length; i++) {
      const el = dots[i]!;
      const o = parseFloat(el.style.opacity || "1");
      const next = o * 0.88;
      if (next < 0.04) {
        el.remove();
        dots.splice(i, 1);
        i--;
      } else {
        el.style.opacity = String(next);
        const s = parseFloat(el.style.width || String(size));
        el.style.width = `${Math.max(2, s * 0.96)}px`;
        el.style.height = el.style.width;
      }
    }
    if (dots.length) {
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
    const x = e.clientX - rect.left + root.scrollLeft;
    const y = e.clientY - rect.top + root.scrollTop;

    const dot = document.createElement("div");
    dot.setAttribute("data-magic-cursor-trail-dot", "");
    dot.style.cssText = [
      "position:absolute",
      `left:${x}px`,
      `top:${y}px`,
      "pointer-events:none",
      "border-radius:50%",
      `width:${size}px`,
      `height:${size}px`,
      `background:${color}`,
      "transform:translate(-50%,-50%)",
      "z-index:2147483000",
    ].join(";");

    root.appendChild(dot);
    dots.push(dot);
    while (dots.length > maxDots) {
      const old = dots.shift()!;
      old.remove();
    }
    ensureRaf();
  };

  root.addEventListener("pointermove", onMove);

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      for (const d of dots) {
        d.remove();
      }
      dots.length = 0;
    },
  };
}
