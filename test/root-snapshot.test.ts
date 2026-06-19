import { afterEach, describe, expect, it } from "vitest";
import { createRootSnapshot } from "../src/utils/root-snapshot";

function createRoot() {
  const root = document.createElement("section");
  root.className = "stage theme-dark";
  root.style.backgroundColor = "rgb(10, 20, 30)";
  root.style.backgroundImage = "linear-gradient(red, blue)";
  root.style.backgroundPosition = "center center";
  root.style.backgroundRepeat = "no-repeat";
  root.style.backgroundSize = "cover";
  root.style.boxSizing = "border-box";
  root.style.color = "rgb(240, 240, 240)";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.padding = "4px 5px 6px 7px";
  root.style.textAlign = "center";

  Object.defineProperties(root, {
    clientHeight: { configurable: true, value: 80 },
    clientWidth: { configurable: true, value: 120 },
  });

  root.append(" static text ");

  const content = document.createElement("strong");
  content.dataset.testId = "content";
  content.textContent = "Visible";
  root.appendChild(content);

  const overlay = document.createElement("div");
  overlay.setAttribute("data-magic-cursor-future-effect", "");
  overlay.textContent = "Overlay";
  root.appendChild(overlay);

  document.body.appendChild(root);
  return { content, root };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createRootSnapshot", () => {
  it("copies root presentation and non-overlay children into an inert mirror", () => {
    const { content, root } = createRoot();

    const snapshot = createRootSnapshot(root);

    expect(snapshot.element.getAttribute("data-magic-cursor-root-snapshot")).toBe(
      "",
    );
    expect(snapshot.element.style.width).toBe("120px");
    expect(snapshot.element.style.height).toBe("80px");

    const layout = snapshot.element.querySelector(
      "[data-magic-cursor-root-snapshot-layout]",
    ) as HTMLDivElement;
    const background = snapshot.element.querySelector(
      "[data-magic-cursor-root-snapshot-background]",
    ) as HTMLDivElement;
    const flow = snapshot.element.querySelector(
      "[data-magic-cursor-root-snapshot-flow]",
    ) as HTMLDivElement;

    expect(layout.className).toBe("stage theme-dark");
    expect(background.style.backgroundColor).toBe("rgb(10, 20, 30)");
    expect(background.style.backgroundPosition).toBe("center center");
    expect(background.style.backgroundRepeat).toBe("no-repeat");
    expect(background.style.backgroundSize).toBe("cover");

    expect(flow.style.display).toBe("flex");
    expect(flow.style.flexDirection).toBe("column");
    expect(flow.style.padding).toBe("4px 5px 6px 7px");
    expect(flow.style.color).toBe("rgb(240, 240, 240)");
    expect(flow.style.textAlign).toBe("center");
    expect(flow.textContent).toContain("static text");
    expect(flow.querySelector("[data-test-id='content']")).not.toBe(content);
    expect(flow.querySelector("[data-magic-cursor-future-effect]")).toBeNull();
    expect(flow.textContent).not.toContain("Overlay");
  });

  it("keeps the snapshot static until a new snapshot is created", () => {
    const { root } = createRoot();
    const snapshot = createRootSnapshot(root);

    const lateContent = document.createElement("span");
    lateContent.textContent = "Late content";
    root.appendChild(lateContent);

    expect(snapshot.element.textContent).not.toContain("Late content");
    expect(createRootSnapshot(root).element.textContent).toContain(
      "Late content",
    );
  });

  it("syncs mirror dimensions from the current root client size", () => {
    const { root } = createRoot();
    const snapshot = createRootSnapshot(root);

    Object.defineProperties(root, {
      clientHeight: { configurable: true, value: 140 },
      clientWidth: { configurable: true, value: 220 },
    });
    snapshot.syncSize();

    expect(snapshot.element.style.width).toBe("220px");
    expect(snapshot.element.style.height).toBe("140px");
  });
});
