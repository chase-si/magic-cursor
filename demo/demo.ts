import { createEffect, type Destroyable, type EffectName } from "../src/index";

const grid = document.getElementById("grid") as HTMLElement;
const destroyables: Destroyable[] = [];

function isEffectName(v: string): v is EffectName {
  return (
    v === "spotlight" ||
    v === "trail" ||
    v === "flame" ||
    v === "magnetic" ||
    v === "ring" ||
    v === "magnifier" ||
    v === "invertRing"
  );
}

function mountAll() {
  for (const cell of grid.querySelectorAll<HTMLElement>(".cell")) {
    const name = cell.dataset.effect ?? "";
    if (!isEffectName(name)) {
      continue;
    }
    switch (name) {
      case "spotlight":
        destroyables.push(
          createEffect("spotlight", cell, {
            radius: 50,
            dimColor: "rgba(2, 6, 23, 0.95)",
          }),
        );
        break;
      case "trail":
        destroyables.push(
          createEffect("trail", cell, {
            color: "rgba(236, 72, 153, 0.5)",
            maxDots: 24,
            size: 24,
            throttleMs: 12,
          }),
        );
        break;
      case "flame":
        destroyables.push(
          createEffect("flame", cell, {
            emission: 2,
            size: 12,
            lifeMs: 720,
            rise: 1.7,
            jitter: 1,
          }),
        );
        break;
      case "magnetic":
        destroyables.push(
          createEffect("magnetic", cell, {
            strength: 0.6,
            selector: "[data-magnetic]",
          }),
        );
        break;
      case "ring":
        destroyables.push(
          createEffect("ring", cell, {
            size: 38,
            color: "rgba(165, 180, 252, 0.95)",
            borderWidth: 2,
            smoothing: 0.22,
          }),
        );
        break;
      case "magnifier":
        destroyables.push(
          createEffect("magnifier", cell, {
            size: 44,
            color: "rgba(165, 180, 252, 0.95)",
            borderWidth: 2,
            zoom: 1.6,
            smoothing: 0.1,
            lensBlurPx: 2,
            lensBrightness: 1.5,
            lensSaturate: 1.25,
            lensFillOpacity: 0.3,
          }),
        );
        break;
      case "invertRing":
        destroyables.push(
          createEffect("invertRing", cell, {
            size: 44,
            color: "rgba(165, 180, 252, 0.95)",
            borderWidth: 2,
            smoothing: 0.12,
          }),
        );
        break;
    }
  }
}

function destroyAll() {
  for (const d of destroyables) {
    d.destroy();
  }
  destroyables.length = 0;
}

mountAll();
