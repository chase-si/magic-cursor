import type { Destroyable, MagnifierOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";

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

  const prevCursor = root.style.cursor;
  root.style.cursor = "none";

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

  const lensContent = document.createElement("div");
  lensContent.setAttribute("data-magic-cursor-magnifier-content", "");
  lensContent.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "pointer-events:none",
    "transform-origin:0 0",
    "will-change:transform",
  ].join(";");

  const syncContentSize = () => {
    // 关键：放大内容的坐标系必须与 root 一致（否则绝对定位/文字布局会错位）
    const w = root.clientWidth;
    const h = root.clientHeight;
    lensContent.style.width = `${w}px`;
    lensContent.style.height = `${h}px`;
  };

  // 生成一次静态快照：背景 + 子树（排除 magic-cursor 自己的 overlay）
  const computed = getComputedStyle(root);
  const layout = document.createElement("div");
  layout.setAttribute("data-magic-cursor-magnifier-layout", "");
  // 关键：复刻 root 的布局/排版，避免普通文档流文本在镜片中错位或不可见
  layout.className = root.className;
  layout.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "isolation:isolate",
    "background:transparent",
  ].join(";");
  lensContent.appendChild(layout);

  const flow = document.createElement("div");
  flow.setAttribute("data-magic-cursor-magnifier-flow", "");
  flow.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "z-index:1",
    `display:${computed.display}`,
    `box-sizing:${computed.boxSizing}`,
    `padding:${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`,
    `flex-direction:${computed.flexDirection}`,
    `flex-wrap:${computed.flexWrap}`,
    `justify-content:${computed.justifyContent}`,
    `align-items:${computed.alignItems}`,
    `align-content:${computed.alignContent}`,
    `place-items:${computed.placeItems}`,
    `place-content:${computed.placeContent}`,
    `color:${computed.color}`,
    `font:${computed.font}`,
    `text-align:${computed.textAlign}`,
    `line-height:${computed.lineHeight}`,
    `letter-spacing:${computed.letterSpacing}`,
    `white-space:${computed.whiteSpace}`,
  ].join(";");
  layout.appendChild(flow);

  const snapshot = document.createElement("div");
  snapshot.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "z-index:0",
  ].join(";");
  snapshot.style.backgroundColor = computed.backgroundColor;
  snapshot.style.backgroundImage = computed.backgroundImage;
  snapshot.style.backgroundPosition = computed.backgroundPosition;
  snapshot.style.backgroundRepeat = computed.backgroundRepeat;
  snapshot.style.backgroundSize = computed.backgroundSize;
  layout.appendChild(snapshot);

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node.textContent ?? "").trim().length === 0) continue;
      flow.appendChild(node.cloneNode(true));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    if (el.dataset.magicCursorSpotlight !== undefined) continue;
    if (el.dataset.magicCursorTrail !== undefined) continue;
    if (el.dataset.magicCursorRing !== undefined) continue;
    if (el.dataset.magicCursorMagnifier !== undefined) continue;
    if (el.dataset.magicCursorMagnifierLens !== undefined) continue;
    if (el.dataset.magicCursorMagnifierContent !== undefined) continue;
    if (el.dataset.magicCursorInvertRing !== undefined) continue;
    flow.appendChild(el.cloneNode(true));
  }

  lensViewport.appendChild(lensContent);

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let pressScale = 1;

  const updateLens = () => {
    lensViewport.style.left = `${lx}px`;
    lensViewport.style.top = `${ly}px`;
    lensViewport.style.transform = `translate(-50%,-50%) scale(${pressScale})`;

    // 关键：将 “光标下的点” 放大后对齐到镜片中心
    // x' = x*zoom + tx = size/2  => tx = size/2 - x*zoom
    const tx = size / 2 - lx * zoom;
    const ty = size / 2 - ly * zoom;
    lensContent.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
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
    updateLens();
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
    // 绝对定位子元素以 padding box 为参照；这里将坐标也转换到 content box 坐标系
    targetX = e.clientX - rect.left - root.clientLeft;
    targetY = e.clientY - rect.top - root.clientTop;
    schedule();
  };

  const onDown = () => {
    pressScale = 0.85;
    updateLens();
    draw();
    schedule();
  };
  const onUp = () => {
    pressScale = 1;
    updateLens();
    draw();
    schedule();
  };

  lx = root.clientWidth / 2;
  ly = root.clientHeight / 2;
  targetX = lx;
  targetY = ly;

  const ro = observeRootResize(() => {
    syncContentSize();
    updateLens();
    draw();
  });
  root.appendChild(lensViewport);
  root.appendChild(canvas);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);

  syncContentSize();
  updateLens();
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
      lensViewport.remove();
      teardownLayout();
      root.style.cursor = prevCursor;
    },
  };
}

