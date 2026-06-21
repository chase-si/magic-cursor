import { dispatchBuiltinEffect } from "./effect-registry";
import type {
  Destroyable,
  EffectName,
  FlameOptions,
  InvertRingOptions,
  MagnifierOptions,
  MagneticOptions,
  RingOptions,
  SmokeOptions,
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
  SmokeOptions,
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
  name: "smoke",
  target?: HTMLElement,
  options?: SmokeOptions,
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
    | SmokeOptions
    | MagneticOptions
    | MagnifierOptions
    | InvertRingOptions
    | RingOptions,
): Destroyable {
  const root = resolveRoot(target);
  return dispatchBuiltinEffect(name, root, options);
}
