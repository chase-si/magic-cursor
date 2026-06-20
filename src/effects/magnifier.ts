import type { Destroyable, MagnifierOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";
import { createCircularPointerFollowing } from "../utils/circular-pointer-following";
import { acquireRootCursorLock } from "../utils/root-cursor-lock";
import { createRootSnapshot } from "../utils/root-snapshot";

/**
 * 放大镜效果（圈内放大）：
 * - 镜片本体：圆形裁剪 viewport（overflow hidden）
 * - 放大内容：将 root 的背景与子节点做一次静态克隆，按倍率缩放 + 平移对齐光标
 * - 描边：canvas 画圆环（与 ring 一致）
 *
 * 说明：不依赖 DOM → canvas 截图库，因此“放大内容”是 mount 时刻的静态快照；
 * 若 root 内容频繁变化，可后续再加可选的 refresh/observer。
 */
export function mountMagnifier(
  root: HTMLElement,
  options: MagnifierOptions = {},
): Destroyable {
  const size = options.size ?? 36;
  const color = options.color ?? "rgba(99, 102, 241, 0.9)";
  const borderWidth = options.borderWidth ?? 2;
  const smoothing = options.smoothing ?? 0.18;
  const zoom = Math.max(1, options.zoom ?? 1.6);
  const lensBlurPx = options.lensBlurPx ?? 6;
  const lensBrightness = options.lensBrightness ?? 1.15;
  const lensSaturate = options.lensSaturate ?? 1.25;
  const lensFillOpacity = options.lensFillOpacity ?? 0.06;

  const releaseCursorLock = acquireRootCursorLock(root);

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-magnifier": "",
    "data-magic-cursor-magnifier-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  const lensViewport = document.createElement("div");
  lensViewport.setAttribute("data-magic-cursor-magnifier-lens", "");
  lensViewport.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "pointer-events:none",
    "border-radius:50%",
    "overflow:hidden",
    `width:${size}px`,
    `height:${size}px`,
    "transform:translate(-50%,-50%) scale(1)",
    "will-change:transform,left,top",
    `backdrop-filter:blur(${lensBlurPx}px) brightness(${lensBrightness}) saturate(${lensSaturate})`,
    `-webkit-backdrop-filter:blur(${lensBlurPx}px) brightness(${lensBrightness}) saturate(${lensSaturate})`,
    // 玻璃底色与高光（叠加在放大内容之上）
    `background:radial-gradient(60% 60% at 32% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0) 60%), rgba(255,255,255,${lensFillOpacity})`,
    "box-shadow:0 10px 26px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 -10px 20px rgba(0,0,0,0.18)",
    "z-index:2147482999",
  ].join(";");

  const rootSnapshot = createRootSnapshot(root);
  const lensContent = rootSnapshot.element;

  lensViewport.appendChild(lensContent);

  const updateLens = () => {
    const { x: lx, y: ly } = following.getPosition();
    const pressScale = following.getPressScale();
    lensViewport.style.left = `${lx}px`;
    lensViewport.style.top = `${ly}px`;
    lensViewport.style.transform = `translate(-50%,-50%) scale(${pressScale})`;

    const tx = size / 2 - lx * zoom;
    const ty = size / 2 - ly * zoom;
    lensContent.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
  };

  const draw = () => {
    const bw = canvas.width;
    const bh = canvas.height;
    const dpr = layer.getDpr();
    const { x: lx, y: ly } = following.getPosition();
    const pressScale = following.getPressScale();

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

  const following = createCircularPointerFollowing({
    root,
    smoothing,
    onAnimate: () => {
      updateLens();
      draw();
    },
  });

  const onMove = (e: PointerEvent) => {
    following.followPointerEvent(e);
  };

  const onDown = () => {
    following.handlePressStart();
  };
  const onUp = () => {
    following.handlePressEnd();
  };

  following.initializeFromRootCenter();

  const ro = observeRootResize(() => {
    rootSnapshot.syncSize();
    following.redraw();
  });
  root.appendChild(lensViewport);
  root.appendChild(canvas);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);

  rootSnapshot.syncSize();
  following.redraw();

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      following.cancelAnimation();
      ro.disconnect();
      canvas.remove();
      lensViewport.remove();
      teardownLayout();
      releaseCursorLock();
    },
  };
}
