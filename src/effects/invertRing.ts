import type { Destroyable, InvertRingOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";

/**
 * 反色圆环：圈内对内容做反色（静态快照），圈外保持原样。
 */
export function mountInvertRing(
  root: HTMLElement,
  options: InvertRingOptions = {},
): Destroyable {
  const size = options.size ?? 36;
  const color = options.color ?? "rgba(99, 102, 241, 0.9)";
  const borderWidth = options.borderWidth ?? 2;
  const smoothing = options.smoothing ?? 0.18;
  const blendMode = options.blendMode ?? "difference";

  const prevCursor = root.style.cursor;
  root.style.cursor = "none";

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-invert-ring": "",
    "data-magic-cursor-invert-ring-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  const viewport = document.createElement("div");
  viewport.setAttribute("data-magic-cursor-invert-ring-viewport", "");
  viewport.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "pointer-events:none",
    "border-radius:50%",
    "overflow:hidden",
    // 将 mix-blend-mode 的影响限制在圈内
    "isolation:isolate",
    `width:${size}px`,
    `height:${size}px`,
    "transform:translate(-50%,-50%) scale(1)",
    "will-change:transform,left,top",
    "z-index:2147482999",
  ].join(";");

  const content = document.createElement("div");
  content.setAttribute("data-magic-cursor-invert-ring-content", "");
  content.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "pointer-events:none",
    "transform-origin:0 0",
    "will-change:transform",
  ].join(";");
  viewport.appendChild(content);

  const invertLayer = document.createElement("div");
  invertLayer.setAttribute("data-magic-cursor-invert-ring-layer", "");
  invertLayer.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "background:#fff",
    // 白色与底图做 difference = 反色（默认）
    `mix-blend-mode:${blendMode}`,
  ].join(";");
  viewport.appendChild(invertLayer);

  const syncContentSize = () => {
    content.style.width = `${root.clientWidth}px`;
    content.style.height = `${root.clientHeight}px`;
  };

  const computed = getComputedStyle(root);
  const snapshot = document.createElement("div");
  snapshot.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
  ].join(";");
  snapshot.style.backgroundColor = computed.backgroundColor;
  snapshot.style.backgroundImage = computed.backgroundImage;
  snapshot.style.backgroundPosition = computed.backgroundPosition;
  snapshot.style.backgroundRepeat = computed.backgroundRepeat;
  snapshot.style.backgroundSize = computed.backgroundSize;
  content.appendChild(snapshot);

  for (const child of Array.from(root.children)) {
    const el = child as HTMLElement;
    if (el.dataset.magicCursorSpotlight !== undefined) continue;
    if (el.dataset.magicCursorTrail !== undefined) continue;
    if (el.dataset.magicCursorRing !== undefined) continue;
    if (el.dataset.magicCursorMagnifier !== undefined) continue;
    if (el.dataset.magicCursorInvertRing !== undefined) continue;
    content.appendChild(el.cloneNode(true));
  }

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let pressScale = 1;

  const update = () => {
    viewport.style.left = `${lx}px`;
    viewport.style.top = `${ly}px`;
    viewport.style.transform = `translate(-50%,-50%) scale(${pressScale})`;

    // 将光标点对齐到 viewport 中心（不缩放，zoom=1）
    const tx = size / 2 - lx;
    const ty = size / 2 - ly;
    content.style.transform = `translate(${tx}px, ${ty}px)`;
  };

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
    update();
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
    targetX = e.clientX - rect.left - root.clientLeft;
    targetY = e.clientY - rect.top - root.clientTop;
    schedule();
  };

  const onDown = () => {
    pressScale = 0.85;
    update();
    draw();
    schedule();
  };
  const onUp = () => {
    pressScale = 1;
    update();
    draw();
    schedule();
  };

  lx = root.clientWidth / 2;
  ly = root.clientHeight / 2;
  targetX = lx;
  targetY = ly;

  const ro = observeRootResize(() => {
    syncContentSize();
    update();
    draw();
  });
  root.appendChild(viewport);
  root.appendChild(canvas);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);

  syncContentSize();
  update();
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
      viewport.remove();
      teardownLayout();
      root.style.cursor = prevCursor;
    },
  };
}

