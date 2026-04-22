const MAX_DPR = 2;

export type CanvasLayer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  resize: () => void;
  getDpr: () => number;
  observeRootResize: (onResize: () => void) => ResizeObserver;
  teardownLayout: () => void;
};

/**
 * 在 root 上创建与 client 区域对齐的 canvas（含 DPR、ResizeObserver、static→relative）。
 */
export function createCanvasLayer(
  root: HTMLElement,
  dataAttrs: Record<string, string>,
): CanvasLayer {
  const prevPosition = root.style.position;
  const computed = getComputedStyle(root);
  if (computed.position === "static") {
    root.style.position = "relative";
  }

  const canvas = document.createElement("canvas");
  for (const [key, value] of Object.entries(dataAttrs)) {
    canvas.setAttribute(key, value);
  }
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
    throw new Error("magic-cursor: 2D canvas context unavailable");
  }

  let dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    MAX_DPR,
  );

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = root.clientWidth;
    const h = root.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  };

  const observeRootResize = (onResize: () => void) => {
    const ro = new ResizeObserver(() => {
      resize();
      onResize();
    });
    ro.observe(root);
    resize();
    onResize();
    return ro;
  };

  const teardownLayout = () => {
    if (computed.position === "static") {
      root.style.position = prevPosition;
    }
  };

  return {
    canvas,
    ctx,
    resize,
    getDpr: () => dpr,
    observeRootResize,
    teardownLayout,
  };
}

