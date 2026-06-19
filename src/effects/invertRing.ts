import type { Destroyable, InvertRingOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";
import {
  clientPointToMountRootPoint,
  isWithinMountRootReach,
  pointerEventToMountRootPoint,
} from "../utils/mount-root-coordinates";
import { acquireRootCursorLock } from "../utils/root-cursor-lock";
import { createRootSnapshot } from "../utils/root-snapshot";

/** 未指定 `blendBackground` 时，按常见混合模式给一层较合理的默认底色（仍可被 options 覆盖）。 */
function defaultBlendBackground(blendMode: string): string {
  const m = blendMode.trim().toLowerCase();
  switch (m) {
    case "difference":
    case "exclusion":
      return "#fff";
    case "screen":
    case "plus-lighter":
      return "#000";
    case "multiply":
    case "darken":
    case "color-burn":
      // multiply 与 #fff 几乎不改变底层；用浅灰才能压暗
      return "#c8c8c8";
    case "overlay":
    case "soft-light":
    case "hard-light":
      return "#808080";
    case "lighten":
    case "color-dodge":
      return "#000";
    default:
      return "#fff";
  }
}

/**
 * 反色圆环：圈内对内容做反色（静态快照），圈外保持原样。
 */
export function mountInvertRing(
  root: HTMLElement,
  options: InvertRingOptions = {},
): Destroyable {
  const size = options.size ?? 36;
  const color = options.color ?? "rgba(99, 102, 241, 0.9)";
  const borderWidth = options.borderWidth ?? 0;
  const smoothing = options.smoothing ?? 0.18;
  const blendMode = options.blendMode ?? "difference";
  const blendBackground =
    options.blendBackground ?? defaultBlendBackground(blendMode);
  const respectPointerOcclusion = options.respectPointerOcclusion !== false;
  const layerZIndex = Number.isFinite(options.layerZIndex as number)
    ? (options.layerZIndex as number)
    : 2147482999;

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-invert-ring": "",
    "data-magic-cursor-invert-ring-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;
  canvas.style.zIndex = String(layerZIndex + 1);

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
    `z-index:${layerZIndex}`,
  ].join(";");

  const rootSnapshot = createRootSnapshot(root);
  const content = rootSnapshot.element;
  viewport.appendChild(content);

  const invertLayer = document.createElement("div");
  invertLayer.setAttribute("data-magic-cursor-invert-ring-layer", "");
  // mix-blend-mode：`blendBackground` 与底层镜像混合；默认随 `blendMode` 变化（如 difference→白、screen→黑）
  invertLayer.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "border-radius:inherit",
    "overflow:hidden",
    `background:${blendBackground}`,
    `mix-blend-mode:${blendMode}`,
  ].join(";");
  viewport.appendChild(invertLayer);

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let pressScale = 1;
  let active = false;
  let releaseCursorLock: (() => void) | undefined;

  const show = () => {
    viewport.style.display = "";
  };
  const hide = () => {
    viewport.style.display = "none";
  };

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

  const clear = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const onMove = (e: PointerEvent) => {
    const point = pointerEventToMountRootPoint(root, e);
    targetX = point.x;
    targetY = point.y;
    schedule();
  };

  const radius = size / 2;
  const isWithinRingReach = (clientX: number, clientY: number) => {
    const point = clientPointToMountRootPoint(root, { clientX, clientY });
    return isWithinMountRootReach(root, point, radius);
  };

  /** 指针下实际命中是否在 root 子树内（跳过 pointer-events:none 的层后），避免被外部遮罩盖住仍触发 */
  const pointerHitsRoot = (clientX: number, clientY: number) => {
    if (!respectPointerOcclusion) return true;
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return false;
    return el === root || root.contains(el);
  };

  const activate = () => {
    if (active) return;
    active = true;
    releaseCursorLock = acquireRootCursorLock(root);
    show();
    // 仅激活后绘制描边；避免 init 时 canvas 已画环、viewport 隐藏仍露出描边
    update();
    draw();
  };
  const deactivate = () => {
    if (!active) return;
    active = false;
    clear();
    hide();
    releaseCursorLock?.();
    releaseCursorLock = undefined;
  };
  const onWindowMove = (e: PointerEvent) => {
    if (!pointerHitsRoot(e.clientX, e.clientY)) {
      deactivate();
      return;
    }
    if (isWithinRingReach(e.clientX, e.clientY)) {
      activate();
      onMove(e);
    } else {
      deactivate();
    }
  };

  const onRootPointerEnter = (e: PointerEvent) => {
    if (!pointerHitsRoot(e.clientX, e.clientY)) return;
    if (isWithinRingReach(e.clientX, e.clientY)) {
      activate();
      onMove(e);
    }
  };
  const onWindowBlur = () => {
    deactivate();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") {
      deactivate();
    }
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
    rootSnapshot.syncSize();
    update();
    if (active) draw();
  });
  root.appendChild(viewport);
  root.appendChild(canvas);
  root.addEventListener("pointerenter", onRootPointerEnter);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  window.addEventListener("pointermove", onWindowMove);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  rootSnapshot.syncSize();
  update();
  clear();
  // 初始隐藏：避免未进入/离开状态下停留在中心
  viewport.style.display = "none";

  return {
    destroy() {
      root.removeEventListener("pointerenter", onRootPointerEnter);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      deactivate();
      ro.disconnect();
      canvas.remove();
      viewport.remove();
      teardownLayout();
    },
  };
}

