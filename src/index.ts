import { mountMagnetic } from "./effects/magnetic";
import { mountRing } from "./effects/ring";
import { mountSpotlight } from "./effects/spotlight";
import { mountTrail } from "./effects/trail";
import type {
  Destroyable,
  EffectName,
  MagneticOptions,
  RingOptions,
  SpotlightOptions,
  TrailOptions,
} from "./types";

export type {
  Destroyable,
  EffectName,
  MagneticOptions,
  RingOptions,
  SpotlightOptions,
  TrailOptions,
} from "./types";

function resolveRoot(target?: HTMLElement): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("magic-cursor requires a browser environment");
  }
  return target ?? document.body;
}

export function createEffect(
  name: "spotlight",
  target?: HTMLElement,
  options?: SpotlightOptions,
): Destroyable;
export function createEffect(
  name: "trail",
  target?: HTMLElement,
  options?: TrailOptions,
): Destroyable;
export function createEffect(
  name: "magnetic",
  target?: HTMLElement,
  options?: MagneticOptions,
): Destroyable;
export function createEffect(
  name: "ring",
  target?: HTMLElement,
  options?: RingOptions,
): Destroyable;
export function createEffect(
  name: EffectName,
  target?: HTMLElement,
  options?:
    | SpotlightOptions
    | TrailOptions
    | MagneticOptions
    | RingOptions,
): Destroyable {
  const root = resolveRoot(target);
  switch (name) {
    case "spotlight":
      return mountSpotlight(root, options as SpotlightOptions);
    case "trail":
      return mountTrail(root, options as TrailOptions);
    case "magnetic":
      return mountMagnetic(root, options as MagneticOptions);
    case "ring":
      return mountRing(root, options as RingOptions);
    default: {
      const _never: never = name;
      throw new Error(`Unknown effect: ${_never}`);
    }
  }
}
