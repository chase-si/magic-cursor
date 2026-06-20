import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindParticleEffectPointerLifecycle,
  clearParticleEffectCanvas,
  createParticleEffectLifecycle,
} from "../src/utils/particle-effect-lifecycle";
import { createCanvasLayer } from "../src/utils/canvas-layer";

function createRoot(width = 120, height = 80) {
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

describe("createParticleEffectLifecycle", () => {
  it("tracks pointer movement in mount-root space and runs frames", () => {
    let rafRuns = 0;
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => {
      if (rafRuns++ === 0) {
        callback(16);
      }
      return rafRuns;
    });
    const root = createRoot();
    const onFrame = vi.fn();
    const lifecycle = createParticleEffectLifecycle({
      root,
      hasParticles: () => true,
      onFrame,
    });

    lifecycle.handlePointerMove(
      new MouseEvent("pointermove", { clientX: 40, clientY: 50 }),
    );

    expect(lifecycle.getTarget()).toEqual({ x: 40, y: 50 });
    expect(onFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        deltaMs: 16,
        dirty: true,
        targetX: 40,
        targetY: 50,
        timestamp: 16,
      }),
    );
    lifecycle.destroy();
  });

  it("clears immediately on pointer leave when configured", () => {
    vi.mocked(requestAnimationFrame).mockReturnValue(7);
    const root = createRoot();
    const onClear = vi.fn();
    const lifecycle = createParticleEffectLifecycle({
      root,
      hasParticles: () => false,
      onFrame: vi.fn(),
      pointerLeaveBehavior: "clear",
      onPointerLeaveClear: onClear,
    });
    lifecycle.scheduleFrame();

    lifecycle.handlePointerLeave();

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    lifecycle.destroy();
  });

  it("fades on pointer leave by stopping emission while particles remain", () => {
    const root = createRoot();
    const onFade = vi.fn();
    vi.mocked(requestAnimationFrame).mockReturnValue(3);
    const lifecycle = createParticleEffectLifecycle({
      root,
      hasParticles: () => true,
      onFrame: vi.fn(),
      pointerLeaveBehavior: "fade",
      onPointerLeaveFade: onFade,
    });

    lifecycle.handlePointerLeave();

    expect(onFade).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).toHaveBeenCalled();
    lifecycle.destroy();
  });

  it("schedules a frame on resize while particles are visible", () => {
    vi.mocked(requestAnimationFrame).mockReturnValue(11);
    const root = createRoot();
    const lifecycle = createParticleEffectLifecycle({
      root,
      hasParticles: () => true,
      onFrame: vi.fn(),
    });

    lifecycle.onRootResize();

    expect(requestAnimationFrame).toHaveBeenCalled();
    lifecycle.destroy();
  });

  it("cancels animation on destroy", () => {
    vi.mocked(requestAnimationFrame).mockReturnValue(99);
    const root = createRoot();
    const lifecycle = createParticleEffectLifecycle({
      root,
      hasParticles: () => true,
      onFrame: vi.fn(),
    });
    lifecycle.scheduleFrame();

    lifecycle.destroy();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(99);
  });
});

describe("clearParticleEffectCanvas", () => {
  it("clears the full canvas backing store", () => {
    const root = createRoot();
    const layer = createCanvasLayer(root, {});
    layer.resize();
    const ctx = layer.ctx;
    clearParticleEffectCanvas(ctx, layer.canvas);

    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, layer.canvas.width, layer.canvas.height);
  });
});

describe("bindParticleEffectPointerLifecycle", () => {
  it("wires pointer handlers and removes them on destroy", () => {
    const root = createRoot();
    const lifecycle = createParticleEffectLifecycle({
      root,
      hasParticles: () => false,
      onFrame: vi.fn(),
      pointerLeaveBehavior: "clear",
      onPointerLeaveClear: vi.fn(),
    });
    const addSpy = vi.spyOn(root, "addEventListener");
    const removeSpy = vi.spyOn(root, "removeEventListener");

    const binding = bindParticleEffectPointerLifecycle({ root, lifecycle });

    expect(addSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("pointerleave", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("pointercancel", expect.any(Function));

    binding.destroy();

    expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointerleave", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointercancel", expect.any(Function));
    lifecycle.destroy();
  });
});
