import type { Destroyable, MagneticOptions } from "../types";

type Item = {
  el: HTMLElement;
  base: string;
};

export function mountMagnetic(
  root: HTMLElement,
  options: MagneticOptions = {},
): Destroyable {
  const strength = options.strength ?? 0.35;
  const selector = options.selector ?? "[data-magnetic]";

  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
  const items: Item[] = nodes.map((el) => ({
    el,
    base: el.style.transform,
  }));

  let mx = 0;
  let my = 0;
  let raf = 0;

  const tick = () => {
    raf = 0;
    for (const { el } of items) {
      const rect = el.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const cx = rect.left - rootRect.left + rect.width / 2 + root.scrollLeft;
      const cy = rect.top - rootRect.top + rect.height / 2 + root.scrollTop;
      const dx = (mx - cx) * strength;
      const dy = (my - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const schedule = () => {
    if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  };

  const onMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    mx = e.clientX - rect.left + root.scrollLeft;
    my = e.clientY - rect.top + root.scrollTop;
    schedule();
  };

  const onLeave = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    for (const { el, base } of items) {
      el.style.transform = base;
    }
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointercancel", onLeave);

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      for (const { el, base } of items) {
        el.style.transform = base;
      }
    },
  };
}
