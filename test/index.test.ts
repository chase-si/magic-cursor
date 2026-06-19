import { afterEach, describe, expect, it, vi } from "vitest";
import { createEffect, type EffectName } from "../src";

type RectInit = {
  borderLeft?: number;
  borderTop?: number;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
};

function createRoot({
  borderLeft = 0,
  borderTop = 0,
  width = 240,
  height = 160,
  left = 10,
  top = 20,
}: RectInit = {}) {
  const root = document.createElement("div");
  Object.defineProperties(root, {
    clientHeight: { configurable: true, value: height },
    clientLeft: { configurable: true, value: borderLeft },
    clientTop: { configurable: true, value: borderTop },
    clientWidth: { configurable: true, value: width },
  });
  root.getBoundingClientRect = vi.fn(
    () =>
      ({
        bottom: top + height,
        height,
        left,
        right: left + width,
        toJSON: () => ({}),
        top,
        width,
        x: left,
        y: top,
      }) as DOMRect,
  );
  document.body.appendChild(root);
  return root;
}

function latestCanvasContext() {
  const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext);
  return getContext.mock.results.at(-1)?.value as {
    arc: ReturnType<typeof vi.fn>;
    createRadialGradient: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("createEffect", () => {
  it.each([
    ["spotlight", "[data-magic-cursor-spotlight]"],
    ["trail", "[data-magic-cursor-trail]"],
    ["flame", "[data-magic-cursor-flame]"],
    ["smoke", "[data-magic-cursor-smoke]"],
    ["ring", "[data-magic-cursor-ring]"],
    ["magnifier", "[data-magic-cursor-magnifier]"],
    ["invertRing", "[data-magic-cursor-invert-ring]"],
  ] satisfies Array<[EffectName, string]>)(
    "mounts and destroys the %s overlay",
    (name, selector) => {
      const root = createRoot();
      root.style.position = "static";

      const effect = createEffect(name, root);

      expect(root.querySelector(selector)).toBeTruthy();
      expect(root.style.position).toBe("relative");

      effect.destroy();

      expect(root.querySelector(selector)).toBeNull();
      expect(root.style.position).toBe("static");
    },
  );

  it("defaults to document.body when no target is passed", () => {
    const effect = createEffect("trail");

    expect(document.body.querySelector("[data-magic-cursor-trail]")).toBeTruthy();

    effect.destroy();

    expect(document.body.querySelector("[data-magic-cursor-trail]")).toBeNull();
  });

  it("throws a browser-environment error when document is unavailable", () => {
    vi.stubGlobal("document", undefined);

    expect(() => createEffect("trail")).toThrow(
      "magic-cursor requires a browser environment",
    );
  });

  it("restores magnetic item transforms on pointer leave and destroy", () => {
    const root = createRoot();
    const item = document.createElement("button");
    item.dataset.magnetic = "";
    item.style.transform = "scale(1.2)";
    root.appendChild(item);

    const effect = createEffect("magnetic", root);

    root.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));
    expect(item.style.transform).toBe("scale(1.2)");

    item.style.transform = "translate(10px, 8px)";
    effect.destroy();

    expect(item.style.transform).toBe("scale(1.2)");
  });

  it("restores the previous cursor for the magnifier effect", () => {
    const root = createRoot();
    root.style.cursor = "help";

    const effect = createEffect("magnifier", root);

    expect(root.style.cursor).toBe("none");

    effect.destroy();

    expect(root.style.cursor).toBe("help");
  });

  it("keeps cursor locks balanced for overlapping ring effects", () => {
    const root = createRoot();
    root.style.cursor = "pointer";
    const first = createEffect("ring", root);
    const second = createEffect("ring", root);

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 60 }),
    );

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("2");

    first.destroy();

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("1");

    second.destroy();

    expect(root.style.cursor).toBe("pointer");
    expect(root.dataset.magicCursorCursorLocks).toBeUndefined();
  });

  it("restores the original cursor after overlapping cursor-hiding effects release", () => {
    const root = createRoot();
    root.style.cursor = "help";
    const magnifier = createEffect("magnifier", root);
    const ring = createEffect("ring", root);

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 60 }),
    );

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("2");

    magnifier.destroy();

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("1");

    ring.destroy();

    expect(root.style.cursor).toBe("help");
    expect(root.dataset.magicCursorCursorLocks).toBeUndefined();
  });

  it("keeps the cursor hidden when an activated ring releases before a mounted magnifier", () => {
    const root = createRoot();
    root.style.cursor = "text";
    const ring = createEffect("ring", root);

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 60 }),
    );
    const magnifier = createEffect("magnifier", root);

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("2");

    ring.destroy();

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("1");

    magnifier.destroy();

    expect(root.style.cursor).toBe("text");
    expect(root.dataset.magicCursorCursorLocks).toBeUndefined();
  });

  it("draws ring pointer coordinates from the Mount Root padding edge", () => {
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => {
      callback(16);
      return 1;
    });
    const root = createRoot({ borderLeft: 7, borderTop: 11, left: 30, top: 40 });

    const effect = createEffect("ring", root, { smoothing: 1 });
    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 87, clientY: 109 }),
    );

    expect(latestCanvasContext().arc).toHaveBeenLastCalledWith(
      50,
      58,
      expect.any(Number),
      0,
      Math.PI * 2,
    );

    effect.destroy();
  });

  it("draws spotlight pointer coordinates from the Mount Root padding edge", () => {
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => {
      callback(16);
      return 1;
    });
    const root = createRoot({ borderLeft: 7, borderTop: 11, left: 30, top: 40 });

    const effect = createEffect("spotlight", root);
    root.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 87, clientY: 109 }),
    );

    expect(latestCanvasContext().createRadialGradient).toHaveBeenLastCalledWith(
      50,
      58,
      0,
      50,
      58,
      expect.any(Number),
    );

    effect.destroy();
  });

  it("draws trail pointer coordinates from the Mount Root padding edge", () => {
    const root = createRoot({ borderLeft: 7, borderTop: 11, left: 30, top: 40 });

    const effect = createEffect("trail", root, { throttleMs: 0 });
    root.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 87, clientY: 109 }),
    );

    expect(latestCanvasContext().arc).toHaveBeenLastCalledWith(
      50,
      58,
      expect.any(Number),
      0,
      Math.PI * 2,
    );

    effect.destroy();
  });

  it("keeps cursor locks balanced for overlapping invert ring effects", () => {
    const root = createRoot();
    root.style.cursor = "crosshair";
    const hitTarget = document.createElement("span");
    root.appendChild(hitTarget);
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => hitTarget),
    });
    const first = createEffect("invertRing", root);
    const second = createEffect("invertRing", root);

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 60 }),
    );

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("2");

    first.destroy();

    expect(root.style.cursor).toBe("none");
    expect(root.dataset.magicCursorCursorLocks).toBe("1");

    second.destroy();

    expect(root.style.cursor).toBe("crosshair");
    expect(root.dataset.magicCursorCursorLocks).toBeUndefined();
  });
});
