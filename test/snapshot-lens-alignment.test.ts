import { afterEach, describe, expect, it } from "vitest";
import { alignSnapshotLens } from "../src/utils/snapshot-lens-alignment";

function createLensElements() {
  const viewport = document.createElement("div");
  const content = document.createElement("div");
  viewport.appendChild(content);
  document.body.appendChild(viewport);
  return { content, viewport };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("alignSnapshotLens", () => {
  it("positions the circular viewport on the pointer center with press scale", () => {
    const { content, viewport } = createLensElements();

    alignSnapshotLens(
      { viewport, content, lensSize: 40 },
      { x: 24, y: 36, pressScale: 0.85 },
    );

    expect(viewport.style.left).toBe("24px");
    expect(viewport.style.top).toBe("36px");
    expect(viewport.style.transform).toBe("translate(-50%,-50%) scale(0.85)");
  });

  it("translates snapshot content so the pointer sits at the lens center without zoom", () => {
    const { content, viewport } = createLensElements();

    alignSnapshotLens(
      { viewport, content, lensSize: 40 },
      { x: 24, y: 36 },
    );

    expect(content.style.transform).toBe("translate(-4px, -16px)");
  });

  it("scales snapshot content when zoom is above one", () => {
    const { content, viewport } = createLensElements();

    alignSnapshotLens(
      { viewport, content, lensSize: 40, zoom: 2 },
      { x: 10, y: 15 },
    );

    expect(content.style.transform).toBe("translate(0px, -10px) scale(2)");
  });

  it("recomputes content alignment when the lens size changes after resize", () => {
    const { content, viewport } = createLensElements();

    alignSnapshotLens(
      { viewport, content, lensSize: 40 },
      { x: 20, y: 30 },
    );
    expect(content.style.transform).toBe("translate(0px, -10px)");

    alignSnapshotLens(
      { viewport, content, lensSize: 60 },
      { x: 20, y: 30 },
    );
    expect(content.style.transform).toBe("translate(10px, 0px)");
  });
});
