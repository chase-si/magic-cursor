import { describe, expect, it, vi } from "vitest";
import {
  clientPointToMountRootPoint,
  isWithinMountRootReach,
} from "../src/utils/mount-root-coordinates";

type RootInit = {
  borderLeft?: number;
  borderTop?: number;
  height?: number;
  left?: number;
  paddingLeft?: string;
  top?: number;
  width?: number;
};

function createMountRoot({
  borderLeft = 0,
  borderTop = 0,
  height = 80,
  left = 0,
  paddingLeft,
  top = 0,
  width = 120,
}: RootInit = {}) {
  const root = document.createElement("div");
  if (paddingLeft) {
    root.style.paddingLeft = paddingLeft;
  }
  Object.defineProperties(root, {
    clientHeight: { configurable: true, value: height },
    clientLeft: { configurable: true, value: borderLeft },
    clientTop: { configurable: true, value: borderTop },
    clientWidth: { configurable: true, value: width },
  });
  root.getBoundingClientRect = vi.fn(
    () =>
      ({
        bottom: top + height + borderTop,
        height: height + borderTop,
        left,
        right: left + width + borderLeft,
        toJSON: () => ({}),
        top,
        width: width + borderLeft,
        x: left,
        y: top,
      }) as DOMRect,
  );
  return root;
}

describe("Mount Root pointer coordinates", () => {
  it.each([
    ["plain", createMountRoot(), { clientX: 24, clientY: 32 }, { x: 24, y: 32 }],
    [
      "offset",
      createMountRoot({ left: 30, top: 40 }),
      { clientX: 54, clientY: 72 },
      { x: 24, y: 32 },
    ],
    [
      "bordered",
      createMountRoot({ borderLeft: 7, borderTop: 11, left: 30, top: 40 }),
      { clientX: 61, clientY: 83 },
      { x: 24, y: 32 },
    ],
    [
      "padded",
      createMountRoot({ left: 30, paddingLeft: "16px", top: 40 }),
      { clientX: 54, clientY: 72 },
      { x: 24, y: 32 },
    ],
  ])(
    "maps %s roots into the Mount Root client surface",
    (_name, root, clientPoint, expected) => {
      expect(clientPointToMountRootPoint(root, clientPoint)).toEqual(expected);
    },
  );

  it("checks reach against the Mount Root client-sized surface", () => {
    const root = createMountRoot({ borderLeft: 7, borderTop: 11, width: 120, height: 80 });

    expect(isWithinMountRootReach(root, { x: 125, y: 85 }, 5)).toBe(true);
    expect(isWithinMountRootReach(root, { x: 126, y: 85 }, 5)).toBe(false);
  });
});
