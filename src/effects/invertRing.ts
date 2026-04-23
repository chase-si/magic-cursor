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

  const CURSOR_LOCK_KEY = "magicCursorCursorLocks";
  const PREV_CURSOR_KEY = "magicCursorPrevCursor";
  const acquireCursor = () => {
    const locks = Number(root.dataset[CURSOR_LOCK_KEY] ?? 0) || 0;
    if (locks === 0) {
      root.dataset[PREV_CURSOR_KEY] = root.style.cursor;
      root.style.cursor = "none";
    }
    root.dataset[CURSOR_LOCK_KEY] = String(locks + 1);
  };
  const releaseCursor = () => {
    const locks = Number(root.dataset[CURSOR_LOCK_KEY] ?? 0) || 0;
    const next = Math.max(0, locks - 1);
    if (next === 0) {
      root.style.cursor = root.dataset[PREV_CURSOR_KEY] ?? "";
      delete root.dataset[PREV_CURSOR_KEY];
      delete root.dataset[CURSOR_LOCK_KEY];
    } else {
      root.dataset[CURSOR_LOCK_KEY] = String(next);
    }
  };

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

  const supportsBackdropInvert =
    typeof CSS !== "undefined" &&
    (CSS.supports("backdrop-filter", "invert(1)") ||
      CSS.supports("-webkit-backdrop-filter", "invert(1)"));

  const invertLayer = document.createElement("div");
  invertLayer.setAttribute("data-magic-cursor-invert-ring-layer", "");
  invertLayer.style.cssText = supportsBackdropInvert
    ? [
        "position:absolute",
        "inset:0",
        "pointer-events:none",
        // 使用实时背景反色，避免静态 clone 快照丢失文本/伪元素等问题
        "background:rgba(255,255,255,0.01)",
        "backdrop-filter:invert(1)",
        "-webkit-backdrop-filter:invert(1)",
      ].join(";")
    : [
        "position:absolute",
        "inset:0",
        "pointer-events:none",
        "background:#fff",
        // 回退到差值混合（静态快照方案）
        `mix-blend-mode:${blendMode}`,
      ].join(";");
  viewport.appendChild(invertLayer);

  const syncContentSize = () => {
    content.style.width = `${root.clientWidth}px`;
    content.style.height = `${root.clientHeight}px`;
  };

  if (!supportsBackdropInvert) {
    const computed = getComputedStyle(root);
    const layout = document.createElement("div");
    layout.setAttribute("data-magic-cursor-invert-ring-layout", "");
    // 关键点：快照需要复刻 root 的布局/排版，否则非 absolute 的文本会因布局丢失而不可见或严重错位
    layout.className = root.className;
    layout.style.cssText = [
      "position:absolute",
      "inset:0",
      "pointer-events:none",
      // background 已由 snapshot 单独处理（避免某些场景下重复混合）
      "background:transparent",
      // layout
      `display:${computed.display}`,
      `box-sizing:${computed.boxSizing}`,
      `padding:${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`,
      // flex
      `flex-direction:${computed.flexDirection}`,
      `flex-wrap:${computed.flexWrap}`,
      `justify-content:${computed.justifyContent}`,
      `align-items:${computed.alignItems}`,
      `align-content:${computed.alignContent}`,
      // grid (when applicable)
      `place-items:${computed.placeItems}`,
      `place-content:${computed.placeContent}`,
      // text / font
      `color:${computed.color}`,
      `font:${computed.font}`,
      `text-align:${computed.textAlign}`,
      `line-height:${computed.lineHeight}`,
      `letter-spacing:${computed.letterSpacing}`,
      `white-space:${computed.whiteSpace}`,
    ].join(";");
    content.appendChild(layout);

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
    layout.appendChild(snapshot);

    for (const node of Array.from(root.childNodes)) {
      // 允许 root 直接包含文本（非元素子节点）；否则会“看不到文本”
      if (node.nodeType === Node.TEXT_NODE) {
        // 保留空白/换行通常没有意义，但克隆不会影响性能；这里过滤掉纯空白
        if ((node.textContent ?? "").trim().length === 0) continue;
        layout.appendChild(node.cloneNode(true));
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const el = node as HTMLElement;
      if (el.dataset.magicCursorSpotlight !== undefined) continue;
      if (el.dataset.magicCursorTrail !== undefined) continue;
      if (el.dataset.magicCursorRing !== undefined) continue;
      if (el.dataset.magicCursorMagnifier !== undefined) continue;
      if (el.dataset.magicCursorInvertRing !== undefined) continue;
      layout.appendChild(el.cloneNode(true));
    }
  }

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let pressScale = 1;
  let active = false;

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
    const rect = root.getBoundingClientRect();
    targetX = e.clientX - rect.left - root.clientLeft;
    targetY = e.clientY - rect.top - root.clientTop;
    schedule();
  };

  const radius = size / 2;
  const isWithinRingReach = (clientX: number, clientY: number) => {
    const rect = root.getBoundingClientRect();
    const x = clientX - rect.left - root.clientLeft;
    const y = clientY - rect.top - root.clientTop;
    return x >= -radius && x <= rect.width + radius && y >= -radius && y <= rect.height + radius;
  };

  const activate = () => {
    if (active) return;
    active = true;
    acquireCursor();
    show();
  };
  const deactivate = () => {
    if (!active) return;
    active = false;
    clear();
    hide();
    releaseCursor();
  };
  const onWindowMove = (e: PointerEvent) => {
    if (isWithinRingReach(e.clientX, e.clientY)) {
      activate();
      onMove(e);
    } else {
      deactivate();
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
    syncContentSize();
    update();
    draw();
  });
  root.appendChild(viewport);
  root.appendChild(canvas);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  window.addEventListener("pointermove", onWindowMove);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  syncContentSize();
  update();
  draw();
  // 初始隐藏：避免未进入/离开状态下停留在中心
  viewport.style.display = "none";
  if (root.matches(":hover")) {
    activate();
  }

  return {
    destroy() {
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

