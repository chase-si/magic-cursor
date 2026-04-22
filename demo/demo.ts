import { createEffect, type Destroyable, type EffectName } from "magic-cursor";

const grid = document.getElementById("grid") as HTMLElement;
const destroyables: Destroyable[] = [];

function isEffectName(v: string): v is EffectName {
  return v === "spotlight" || v === "trail" || v === "magnetic" || v === "ring";
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
            color: "rgba(236, 72, 153, 0.95)",
            maxDots: 24,
            size: 12,
            throttleMs: 8,
          }),
        );
        break;
      case "magnetic":
        destroyables.push(
          createEffect("magnetic", cell, {
            strength: 0.42,
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
