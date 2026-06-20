import { mountFlame } from "./effects/flame";
import { mountMagnetic } from "./effects/magnetic";
import { mountMagnifier } from "./effects/magnifier";
import { mountInvertRing } from "./effects/invertRing";
import { mountRing } from "./effects/ring";
import { mountSmoke } from "./effects/smoke";
import { mountSpotlight } from "./effects/spotlight";
import { mountTrail } from "./effects/trail";
import { BUILTIN_EFFECT_NAMES, type EffectName } from "./effect-names";
import type {
  Destroyable,
  FlameOptions,
  InvertRingOptions,
  MagnifierOptions,
  MagneticOptions,
  RingOptions,
  SmokeOptions,
  SpotlightOptions,
  TrailOptions,
} from "./types";

export { BUILTIN_EFFECT_NAMES, type EffectName } from "./effect-names";

type MountFn = (root: HTMLElement, options?: unknown) => Destroyable;

export type EffectRegistration = {
  name: EffectName;
  /** Overlay marker for smoke tests; null when the effect has no dedicated overlay node */
  overlaySelector: string | null;
  mount: MountFn;
  mountDemo: (cell: HTMLElement) => Destroyable;
};

export const EFFECT_REGISTRY: readonly EffectRegistration[] = [
  {
    name: "spotlight",
    overlaySelector: "[data-magic-cursor-spotlight]",
    mount: (root, options) => mountSpotlight(root, options as SpotlightOptions),
    mountDemo: (cell) =>
      mountSpotlight(cell, {
        radius: 50,
        dimColor: "rgba(2, 6, 23, 0.95)",
      }),
  },
  {
    name: "trail",
    overlaySelector: "[data-magic-cursor-trail]",
    mount: (root, options) => mountTrail(root, options as TrailOptions),
    mountDemo: (cell) =>
      mountTrail(cell, {
        color: "rgba(236, 72, 153, 0.5)",
        maxDots: 24,
        size: 24,
        throttleMs: 12,
      }),
  },
  {
    name: "magnetic",
    overlaySelector: null,
    mount: (root, options) => mountMagnetic(root, options as MagneticOptions),
    mountDemo: (cell) =>
      mountMagnetic(cell, {
        strength: 0.6,
        selector: "[data-magnetic]",
      }),
  },
  {
    name: "ring",
    overlaySelector: "[data-magic-cursor-ring]",
    mount: (root, options) => mountRing(root, options as RingOptions),
    mountDemo: (cell) =>
      mountRing(cell, {
        size: 38,
        color: "rgba(165, 180, 252, 0.95)",
        borderWidth: 2,
        smoothing: 0.22,
      }),
  },
  {
    name: "magnifier",
    overlaySelector: "[data-magic-cursor-magnifier]",
    mount: (root, options) => mountMagnifier(root, options as MagnifierOptions),
    mountDemo: (cell) =>
      mountMagnifier(cell, {
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
  },
  {
    name: "invertRing",
    overlaySelector: "[data-magic-cursor-invert-ring]",
    mount: (root, options) => mountInvertRing(root, options as InvertRingOptions),
    mountDemo: (cell) =>
      mountInvertRing(cell, {
        size: 44,
        color: "rgba(165, 180, 252, 0.95)",
        borderWidth: 2,
        smoothing: 0.9,
        blendBackground: "#fff",
        blendMode: "difference",
      }),
  },
  {
    name: "flame",
    overlaySelector: "[data-magic-cursor-flame]",
    mount: (root, options) => mountFlame(root, options as FlameOptions),
    mountDemo: (cell) =>
      mountFlame(cell, {
        emission: 2,
        size: 12,
        lifeMs: 720,
        rise: 1.7,
        jitter: 1,
      }),
  },
  {
    name: "smoke",
    overlaySelector: "[data-magic-cursor-smoke]",
    mount: (root, options) => mountSmoke(root, options as SmokeOptions),
    mountDemo: (cell) =>
      mountSmoke(cell, {
        emission: 100,
        size: 12,
        lifeMs: 3000,
        rise: 0.2,
        drift: 0.75,
        color: "rgba(226,232,240,0.22)",
      }),
  },
] as const;

const registryByName = new Map<EffectName, EffectRegistration>(
  EFFECT_REGISTRY.map((entry) => [entry.name, entry]),
);

export function getEffectRegistration(
  name: EffectName,
): EffectRegistration | undefined {
  return registryByName.get(name);
}

export function isEffectName(value: string): value is EffectName {
  return (BUILTIN_EFFECT_NAMES as readonly string[]).includes(value);
}

export function dispatchBuiltinEffect(
  name: string,
  root: HTMLElement,
  options?: unknown,
): Destroyable {
  if (!isEffectName(name)) {
    throw new Error(`Unknown effect: ${name}`);
  }
  const entry = registryByName.get(name);
  if (!entry) {
    throw new Error(`Unknown effect: ${name}`);
  }
  return entry.mount(root, options);
}

export function getRegisteredOverlaySmokeCases(): Array<{
  name: EffectName;
  overlaySelector: string;
}> {
  return EFFECT_REGISTRY.flatMap((entry) =>
    entry.overlaySelector
      ? [{ name: entry.name, overlaySelector: entry.overlaySelector }]
      : [],
  );
}
