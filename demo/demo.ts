import {
  getEffectRegistration,
  isEffectName,
} from "../src/effect-registry";
import type { Destroyable } from "../src/index";

const grid = document.getElementById("grid") as HTMLElement;
const destroyables: Destroyable[] = [];

function mountAll() {
  for (const cell of grid.querySelectorAll<HTMLElement>(".cell")) {
    const name = cell.dataset.effect ?? "";
    if (!isEffectName(name)) {
      continue;
    }
    const registration = getEffectRegistration(name);
    if (!registration) {
      continue;
    }
    destroyables.push(registration.mountDemo(cell));
  }
}

function destroyAll() {
  for (const d of destroyables) {
    d.destroy();
  }
  destroyables.length = 0;
}

mountAll();
