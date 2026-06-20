export type SnapshotLensPointer = {
  x: number;
  y: number;
  pressScale?: number;
};

export type SnapshotLensAlignmentTarget = {
  viewport: HTMLElement;
  content: HTMLElement;
  lensSize: number;
  zoom?: number;
};

/**
 * Positions a circular lens viewport on the pointer and aligns static root snapshot
 * content so the mount-root point under the cursor appears at the lens center.
 */
export function alignSnapshotLens(
  target: SnapshotLensAlignmentTarget,
  pointer: SnapshotLensPointer,
): void {
  const pressScale = pointer.pressScale ?? 1;
  const zoom = Math.max(1, target.zoom ?? 1);

  target.viewport.style.left = `${pointer.x}px`;
  target.viewport.style.top = `${pointer.y}px`;
  target.viewport.style.transform = `translate(-50%,-50%) scale(${pressScale})`;

  const tx = target.lensSize / 2 - pointer.x * zoom;
  const ty = target.lensSize / 2 - pointer.y * zoom;

  if (zoom === 1) {
    target.content.style.transform = `translate(${tx}px, ${ty}px)`;
    return;
  }

  target.content.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
}
