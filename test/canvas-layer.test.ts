import { afterEach, describe, expect, it, vi } from "vitest";
import { createCanvasLayer } from "../src/utils/canvas-layer";

function createRoot(width = 101, height = 55) {
  const root = document.createElement("div");
  Object.defineProperties(root, {
    clientHeight: { configurable: true, value: height },
    clientWidth: { configurable: true, value: width },
  });
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 1,
  });
  document.body.innerHTML = "";
});

describe("createCanvasLayer", () => {
  it("creates an attributed canvas with DPR-limited backing size", () => {
    vi.stubGlobal("devicePixelRatio", 3);
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    const root = createRoot();
    root.style.position = "static";

    const layer = createCanvasLayer(root, { "data-test-layer": "yes" });

    layer.resize();

    expect(layer.canvas.getAttribute("data-test-layer")).toBe("yes");
    expect(layer.getDpr()).toBe(2);
    expect(layer.canvas.width).toBe(202);
    expect(layer.canvas.height).toBe(110);
    expect(layer.canvas.style.width).toBe("101px");
    expect(layer.canvas.style.height).toBe("55px");
    expect(root.style.position).toBe("relative");

    layer.teardownLayout();

    expect(root.style.position).toBe("static");
  });

  it("observes root resizes and runs an initial resize callback", () => {
    const root = createRoot(40, 30);
    const layer = createCanvasLayer(root, {});
    const onResize = vi.fn();

    const observer = layer.observeRootResize(onResize);

    expect(observer.observe).toHaveBeenCalledWith(root);
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(layer.canvas.width).toBe(40);
    expect(layer.canvas.height).toBe(30);
  });
});
