import {
  clientPointToMountRootPoint,
  isWithinMountRootReach,
  pointerEventToMountRootPoint,
} from "./mount-root-coordinates";

const PRESS_SCALE_ACTIVE = 0.85;

export type CircularPointerFollowingOptions = {
  root: HTMLElement;
  smoothing?: number;
  onAnimate: () => void;
};

export type CircularPointerFollowing = {
  getPosition(): { x: number; y: number };
  getPressScale(): number;
  followPointerEvent(event: PointerEvent): void;
  handlePressStart(): void;
  handlePressEnd(): void;
  scheduleAnimation(): void;
  cancelAnimation(): void;
  initializeFromRootCenter(): void;
  resetPressScale(): void;
  redraw(): void;
};

export function createCircularPointerFollowing(
  options: CircularPointerFollowingOptions,
): CircularPointerFollowing {
  const { root, onAnimate } = options;
  const smoothing = options.smoothing ?? 0.18;

  let lx = 0;
  let ly = 0;
  let targetX = 0;
  let targetY = 0;
  let pressScale = 1;
  let raf = 0;

  const tick = () => {
    raf = 0;
    lx += (targetX - lx) * smoothing;
    ly += (targetY - ly) * smoothing;
    onAnimate();
    if (Math.abs(targetX - lx) > 0.05 || Math.abs(targetY - ly) > 0.05) {
      raf = requestAnimationFrame(tick);
    }
  };

  const scheduleAnimation = () => {
    if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  };

  const cancelAnimation = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  return {
    getPosition() {
      return { x: lx, y: ly };
    },
    getPressScale() {
      return pressScale;
    },
    followPointerEvent(event: PointerEvent) {
      const point = pointerEventToMountRootPoint(root, event);
      targetX = point.x;
      targetY = point.y;
      scheduleAnimation();
    },
    handlePressStart() {
      pressScale = PRESS_SCALE_ACTIVE;
      onAnimate();
      scheduleAnimation();
    },
    handlePressEnd() {
      pressScale = 1;
      onAnimate();
      scheduleAnimation();
    },
    scheduleAnimation,
    cancelAnimation,
    initializeFromRootCenter() {
      lx = root.clientWidth / 2;
      ly = root.clientHeight / 2;
      targetX = lx;
      targetY = ly;
    },
    resetPressScale() {
      pressScale = 1;
    },
    redraw() {
      onAnimate();
    },
  };
}

export function clearCircularFollowerCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export type RingReachPointerFollowingOptions = {
  root: HTMLElement;
  radius: number;
  following: CircularPointerFollowing;
  onActivate: () => void;
  onDeactivate: () => void;
  shouldAcceptPointer?: (clientX: number, clientY: number) => boolean;
  listenRootPointerEnter?: boolean;
  showWhenRootHovered?: boolean;
};

export type RingReachPointerFollowingBinding = {
  destroy(): void;
  onRootResize(): void;
};

export function bindRingReachPointerFollowing(
  options: RingReachPointerFollowingOptions,
): RingReachPointerFollowingBinding {
  const {
    root,
    radius,
    following,
    onActivate,
    onDeactivate,
    shouldAcceptPointer = () => true,
    listenRootPointerEnter = false,
    showWhenRootHovered = false,
  } = options;

  const isWithinReach = (clientX: number, clientY: number) => {
    const point = clientPointToMountRootPoint(root, { clientX, clientY });
    return isWithinMountRootReach(root, point, radius);
  };

  const onMove = (event: PointerEvent) => {
    following.followPointerEvent(event);
  };

  const tryActivateAt = (event: PointerEvent) => {
    if (!shouldAcceptPointer(event.clientX, event.clientY)) {
      onDeactivate();
      return;
    }
    if (isWithinReach(event.clientX, event.clientY)) {
      onActivate();
      onMove(event);
    } else {
      onDeactivate();
    }
  };

  const onWindowMove = (event: PointerEvent) => {
    tryActivateAt(event);
  };

  const onRootPointerEnter = (event: PointerEvent) => {
    tryActivateAt(event);
  };

  const onWindowBlur = () => {
    onDeactivate();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") {
      onDeactivate();
    }
  };

  const onDown = () => {
    following.handlePressStart();
  };

  const onUp = () => {
    following.handlePressEnd();
  };

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  window.addEventListener("pointermove", onWindowMove);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (listenRootPointerEnter) {
    root.addEventListener("pointerenter", onRootPointerEnter);
  }

  if (showWhenRootHovered && root.matches(":hover")) {
    onActivate();
  }

  return {
    onRootResize() {
      following.redraw();
    },
    destroy() {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (listenRootPointerEnter) {
        root.removeEventListener("pointerenter", onRootPointerEnter);
      }
      following.cancelAnimation();
    },
  };
}
