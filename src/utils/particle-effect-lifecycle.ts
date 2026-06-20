import { pointerEventToMountRootPoint } from "./mount-root-coordinates";

export type ParticlePointerLeaveBehavior = "clear" | "fade";

export type ParticleEffectFrameContext = {
  timestamp: number;
  deltaMs: number;
  targetX: number;
  targetY: number;
  dirty: boolean;
  clearDirty: () => void;
};

export type CreateParticleEffectLifecycleOptions = {
  root: HTMLElement;
  hasParticles: () => boolean;
  onFrame: (frame: ParticleEffectFrameContext) => void;
  pointerLeaveBehavior?: ParticlePointerLeaveBehavior;
  onPointerLeaveClear?: () => void;
  onPointerLeaveFade?: () => void;
  initialDirty?: boolean;
  autoStart?: boolean;
};

export type ParticleEffectLifecycle = {
  getTarget(): { x: number; y: number };
  markDirty(): void;
  scheduleFrame(): void;
  cancelFrame(): void;
  handlePointerMove(event: PointerEvent): void;
  handlePointerLeave(): void;
  onRootResize(): void;
  destroy(): void;
};

const DEFAULT_FRAME_MS = 16;
const MAX_DELTA_MS = 32;

export function createParticleEffectLifecycle(
  options: CreateParticleEffectLifecycleOptions,
): ParticleEffectLifecycle {
  const {
    root,
    hasParticles,
    onFrame,
    pointerLeaveBehavior = "clear",
    onPointerLeaveClear,
    onPointerLeaveFade,
    initialDirty = false,
    autoStart = false,
  } = options;

  let targetX = root.clientWidth / 2;
  let targetY = root.clientHeight / 2;
  let dirty = initialDirty;
  let raf = 0;
  let lastT = 0;

  const tick = (timestamp: number) => {
    raf = 0;
    const deltaMs = lastT ? Math.min(MAX_DELTA_MS, timestamp - lastT) : DEFAULT_FRAME_MS;
    lastT = timestamp;
    const frameDirty = dirty;
    onFrame({
      timestamp,
      deltaMs,
      targetX,
      targetY,
      dirty: frameDirty,
      clearDirty: () => {
        dirty = false;
      },
    });
    if (hasParticles()) {
      scheduleFrame();
    }
  };

  const scheduleFrame = () => {
    if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  };

  const cancelFrame = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    const point = pointerEventToMountRootPoint(root, event);
    targetX = point.x;
    targetY = point.y;
    dirty = true;
    scheduleFrame();
  };

  const handlePointerLeave = () => {
    if (pointerLeaveBehavior === "fade") {
      onPointerLeaveFade?.();
      if (hasParticles()) {
        scheduleFrame();
      }
      return;
    }
    onPointerLeaveClear?.();
    lastT = 0;
    dirty = false;
    cancelFrame();
  };

  const onRootResize = () => {
    if (hasParticles()) {
      scheduleFrame();
    }
  };

  const destroy = () => {
    cancelFrame();
  };

  if (autoStart) {
    scheduleFrame();
  }

  return {
    getTarget() {
      return { x: targetX, y: targetY };
    },
    markDirty() {
      dirty = true;
    },
    scheduleFrame,
    cancelFrame,
    handlePointerMove,
    handlePointerLeave,
    onRootResize,
    destroy,
  };
}

export function clearParticleEffectCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export type BindParticleEffectPointerLifecycleOptions = {
  root: HTMLElement;
  lifecycle: ParticleEffectLifecycle;
};

export type ParticleEffectPointerBinding = {
  destroy(): void;
};

export function bindParticleEffectPointerLifecycle(
  options: BindParticleEffectPointerLifecycleOptions,
): ParticleEffectPointerBinding {
  const { root, lifecycle } = options;

  const onMove = (event: PointerEvent) => {
    lifecycle.handlePointerMove(event);
  };
  const onLeave = () => {
    lifecycle.handlePointerLeave();
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointercancel", onLeave);

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      lifecycle.destroy();
    },
  };
}
