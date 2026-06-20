export const BUILTIN_EFFECT_NAMES = [
  "spotlight",
  "trail",
  "magnetic",
  "ring",
  "magnifier",
  "invertRing",
  "flame",
  "smoke",
] as const;

export type EffectName = (typeof BUILTIN_EFFECT_NAMES)[number];
