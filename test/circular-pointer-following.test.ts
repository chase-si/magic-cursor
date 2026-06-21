import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindRingReachPointerFollowing,
  clearCircularFollowerCanvas,
  createCircularPointerFollowing,
} from "../src/utils/circular-pointer-following";
import { createCanvasLayer } from "../src/utils/canvas-layer";

function createRoot(width = 100, height = 100) {
  const root = document.createElement("div");
  Object.defineProperties(root, {
    clientHeight: { configurable: true, value: height },
    clientLeft: { configurable: true, value: 0 },
    clientTop: { configurable: true, value: 0 },
    clientWidth: { configurable: true, value: width },
  });
  root.getBoundingClientRect = vi.fn(
    () =>
      ({
        bottom: height,
        height,
        left: 0,
        right: width,
        toJSON: () => ({}),
        top: 0,
        width,
        x: 0,
        y: 0,
      }) as DOMRect,
  );
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("createCircularPointerFollowing", () => {
  it("smooths pointer position toward the mount-root target", () => {
    let rafRuns = 0;
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => {
      if (rafRuns++ === 0) {
        callback(16);
      }
      return rafRuns;
    });
    const root = createRoot();
    const onAnimate = vi.fn();
    const following = createCircularPointerFollowing({
      root,
      smoothing: 0.5,
      onAnimate,
    });
    following.initializeFromRootCenter();

    following.followPointerEvent(
      new MouseEvent("pointermove", { clientX: 80, clientY: 90 }),
    );

    expect(following.getPosition()).toEqual({ x: 65, y: 70 });
    expect(onAnimate).toHaveBeenCalled();
  });

  it("applies press scale feedback on pointer down and up", () => {
    const root = createRoot();
    const following = createCircularPointerFollowing({
      root,
      onAnimate: vi.fn(),
    });

    following.handlePressStart();
    expect(following.getPressScale()).toBe(0.85);

    following.handlePressEnd();
    expect(following.getPressScale()).toBe(1);
  });

  it("cancels scheduled animation frames", () => {
    vi.mocked(requestAnimationFrame).mockReturnValue(42);
    const root = createRoot();
    const following = createCircularPointerFollowing({
      root,
      onAnimate: vi.fn(),
    });
    following.followPointerEvent(
      new MouseEvent("pointermove", { clientX: 10, clientY: 10 }),
    );

    following.cancelAnimation();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});

describe("clearCircularFollowerCanvas", () => {
  it("clears the full canvas backing store", () => {
    const root = createRoot();
    const layer = createCanvasLayer(root, {});
    layer.resize();
    const ctx = layer.ctx;
    clearCircularFollowerCanvas(ctx, layer.canvas);

    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, layer.canvas.width, layer.canvas.height);
  });
});

describe("bindRingReachPointerFollowing", () => {
  it("activates within reach and deactivates on destroy cleanup", () => {
    const root = createRoot(200, 200);
    const onAnimate = vi.fn();
    const following = createCircularPointerFollowing({
      root,
      smoothing: 1,
      onAnimate,
    });
    following.initializeFromRootCenter();
    const onActivate = vi.fn();
    const onDeactivate = vi.fn();

    const binding = bindRingReachPointerFollowing({
      root,
      radius: 50,
      following,
      onActivate,
      onDeactivate,
    });

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 30, clientY: 40 }),
    );
    expect(onActivate).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 500, clientY: 500 }),
    );
    expect(onDeactivate).toHaveBeenCalledTimes(1);

    binding.destroy();

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 30, clientY: 40 }),
    );
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("redraws when the mount root resizes while active", () => {
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => {
      callback(16);
      return 1;
    });
    const root = createRoot();
    const onAnimate = vi.fn();
    const following = createCircularPointerFollowing({
      root,
      smoothing: 1,
      onAnimate,
    });
    following.initializeFromRootCenter();

    const binding = bindRingReachPointerFollowing({
      root,
      radius: 500,
      following,
      onActivate: vi.fn(),
      onDeactivate: vi.fn(),
    });

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 50 }),
    );
    onAnimate.mockClear();

    binding.onRootResize();

    expect(onAnimate).toHaveBeenCalled();
    binding.destroy();
  });
});
