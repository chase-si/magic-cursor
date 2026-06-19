export type MountRootPoint = {
  x: number;
  y: number;
};

/**
 * Mount Root coordinates start at the root padding edge and map directly to
 * the Effect layer's client-sized drawing/positioning surface.
 */
export function clientPointToMountRootPoint(
  root: HTMLElement,
  point: Pick<PointerEvent, "clientX" | "clientY">,
): MountRootPoint {
  const rect = root.getBoundingClientRect();
  return {
    x: point.clientX - rect.left - root.clientLeft,
    y: point.clientY - rect.top - root.clientTop,
  };
}

export function pointerEventToMountRootPoint(
  root: HTMLElement,
  event: Pick<PointerEvent, "clientX" | "clientY">,
): MountRootPoint {
  return clientPointToMountRootPoint(root, event);
}

export function isWithinMountRootReach(
  root: HTMLElement,
  point: MountRootPoint,
  reach = 0,
) {
  return (
    point.x >= -reach &&
    point.x <= root.clientWidth + reach &&
    point.y >= -reach &&
    point.y <= root.clientHeight + reach
  );
}
