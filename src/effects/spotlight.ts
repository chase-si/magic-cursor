import type { Destroyable, SpotlightOptions } from "../types";
import { mountSpotlightCanvas } from "./spotlight-canvas";

export function mountSpotlight(
  root: HTMLElement,
  options: SpotlightOptions = {},
): Destroyable {
  return mountSpotlightCanvas(root, options);
}
