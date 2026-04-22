import { mountFlame } from "./effects/flame";
import { mountMagnetic } from "./effects/magnetic";
import { mountMagnifier } from "./effects/magnifier";
import { mountInvertRing } from "./effects/invertRing";
import { mountRing } from "./effects/ring";
import { mountSpotlight } from "./effects/spotlight";
import { mountTrail } from "./effects/trail";
import type {
  Destroyable,
  EffectName,
  FlameOptions,
  InvertRingOptions,
  MagnifierOptions,
  MagneticOptions,
  RingOptions,
  SpotlightOptions,
  TrailOptions,
} from "./types";

export type {
  Destroyable,
  EffectName,
  FlameOptions,
  InvertRingOptions,
  MagnifierOptions,
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
  name: "flame",
  target?: HTMLElement,
  options?: FlameOptions,
): Destroyable;
export function createEffect(
  name: "magnetic",
  target?: HTMLElement,
  options?: MagneticOptions,
): Destroyable;
export function createEffect(
  name: "magnifier",
  target?: HTMLElement,
  options?: MagnifierOptions,
): Destroyable;
export function createEffect(
  name: "invertRing",
  target?: HTMLElement,
  options?: InvertRingOptions,
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
    | FlameOptions
    | MagneticOptions
    | MagnifierOptions
    | InvertRingOptions
    | RingOptions,
): Destroyable {
  const root = resolveRoot(target);
  switch (name) {
    case "spotlight":
      return mountSpotlight(root, options as SpotlightOptions);
    case "trail":
      return mountTrail(root, options as TrailOptions);
    case "flame":
      return mountFlame(root, options as FlameOptions);
    case "magnetic":
      return mountMagnetic(root, options as MagneticOptions);
    case "magnifier":
      return mountMagnifier(root, options as MagnifierOptions);
    case "invertRing":
      return mountInvertRing(root, options as InvertRingOptions);
    case "ring":
      return mountRing(root, options as RingOptions);
    default: {
      const _never: never = name;
      throw new Error(`Unknown effect: ${_never}`);
    }
  }
}
