export type RootSnapshot = {
  element: HTMLDivElement;
  syncSize: () => void;
};

const ROOT_SNAPSHOT_ATTR = "data-magic-cursor-root-snapshot";
const ROOT_SNAPSHOT_LAYOUT_ATTR = "data-magic-cursor-root-snapshot-layout";
const ROOT_SNAPSHOT_BACKGROUND_ATTR =
  "data-magic-cursor-root-snapshot-background";
const ROOT_SNAPSHOT_FLOW_ATTR = "data-magic-cursor-root-snapshot-flow";

const copiedFlowStyleProperties = [
  "display",
  "boxSizing",
  "flexDirection",
  "flexWrap",
  "justifyContent",
  "alignItems",
  "alignContent",
  "placeItems",
  "placeContent",
  "color",
  "font",
  "textAlign",
  "lineHeight",
  "letterSpacing",
  "whiteSpace",
] as const;

const copiedBackgroundStyleProperties = [
  "backgroundColor",
  "backgroundImage",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundSize",
] as const;

function hasMagicCursorMarker(el: Element): boolean {
  return Array.from(el.attributes).some((attr) =>
    attr.name.startsWith("data-magic-cursor-"),
  );
}

function appendSnapshotChildren(root: HTMLElement, flow: HTMLDivElement) {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node.textContent ?? "").trim().length === 0) continue;
      flow.appendChild(node.cloneNode(true));
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    if (hasMagicCursorMarker(el)) continue;
    flow.appendChild(el.cloneNode(true));
  }
}

/**
 * Builds the inert, mount-time mirror used by lens-style effects.
 *
 * The snapshot intentionally captures current root content once. Dynamic content is
 * refreshed by destroying and remounting the owning effect.
 */
export function createRootSnapshot(root: HTMLElement): RootSnapshot {
  const computed = getComputedStyle(root);

  const element = document.createElement("div");
  element.setAttribute(ROOT_SNAPSHOT_ATTR, "");
  element.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "pointer-events:none",
    "transform-origin:0 0",
    "will-change:transform",
  ].join(";");

  const layout = document.createElement("div");
  layout.setAttribute(ROOT_SNAPSHOT_LAYOUT_ATTR, "");
  layout.className = root.className;
  layout.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "isolation:isolate",
    "background:transparent",
  ].join(";");
  element.appendChild(layout);

  const background = document.createElement("div");
  background.setAttribute(ROOT_SNAPSHOT_BACKGROUND_ATTR, "");
  background.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "z-index:0",
  ].join(";");
  for (const property of copiedBackgroundStyleProperties) {
    background.style[property] = computed[property];
  }
  layout.appendChild(background);

  const flow = document.createElement("div");
  flow.setAttribute(ROOT_SNAPSHOT_FLOW_ATTR, "");
  flow.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:1",
    `padding:${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`,
  ].join(";");
  for (const property of copiedFlowStyleProperties) {
    flow.style[property] = computed[property];
  }
  layout.appendChild(flow);

  appendSnapshotChildren(root, flow);

  const syncSize = () => {
    element.style.width = `${root.clientWidth}px`;
    element.style.height = `${root.clientHeight}px`;
  };
  syncSize();

  return {
    element,
    syncSize,
  };
}
