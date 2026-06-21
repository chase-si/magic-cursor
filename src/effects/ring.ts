import type { Destroyable, RingOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";
import {
  bindRingReachPointerFollowing,
  clearCircularFollowerCanvas,
  createCircularPointerFollowing,
} from "../utils/circular-pointer-following";
import { acquireRootCursorLock } from "../utils/root-cursor-lock";

/**
 * Canvas 圆环跟随；平滑插值、按下缩放与历史 DOM 版一致。
 */
export function mountRing(
  root: HTMLElement,
  options: RingOptions = {},
): Destroyable {
  const size = options.size ?? 36;
  const color = options.color ?? "rgba(99, 102, 241, 0.9)";
  const borderWidth = options.borderWidth ?? 2;
  const smoothing = options.smoothing ?? 0.18;

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-ring": "",
    "data-magic-cursor-ring-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  let active = false;
  let releaseCursorLock: (() => void) | undefined;

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
    onAnimate: draw,
  });

  const clear = () => {
    following.cancelAnimation();
    clearCircularFollowerCanvas(ctx, canvas);
  };

  const show = () => {
    if (active) return;
    active = true;
    releaseCursorLock = acquireRootCursorLock(root);
    canvas.style.display = "";
  };
  const hide = () => {
    if (!active) return;
    active = false;
    clear();
    releaseCursorLock?.();
    releaseCursorLock = undefined;
    canvas.style.display = "none";
    following.resetPressScale();
  };

  following.initializeFromRootCenter();

  const reachBinding = bindRingReachPointerFollowing({
    root,
    radius: size / 2,
    following,
    onActivate: show,
    onDeactivate: hide,
    showWhenRootHovered: true,
  });

  const ro = observeRootResize(() => {
    reachBinding.onRootResize();
  });
  root.appendChild(canvas);
  canvas.style.display = "none";

  draw();

  return {
    destroy() {
      reachBinding.destroy();
      hide();
      ro.disconnect();
      canvas.remove();
      teardownLayout();
    },
  };
}
