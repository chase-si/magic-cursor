export type Destroyable = { destroy(): void };

export type EffectName = "spotlight" | "trail" | "magnetic" | "ring";

export type SpotlightOptions = {
  /** Spotlight hole radius in px */
  radius?: number;
  /** Dim color outside spotlight (rgba) */
  dimColor?: string;
};

export type TrailOptions = {
  maxDots?: number;
  color?: string;
  size?: number;
  throttleMs?: number;
};

export type MagneticOptions = {
  /** Pull strength 0–1 */
  strength?: number;
  /** Elements to attract; default `[data-magnetic]` inside root */
  selector?: string;
};

export type RingOptions = {
  size?: number;
  color?: string;
  borderWidth?: number;
  /** Follow smoothing 0–1, higher = snappier */
  smoothing?: number;
};
