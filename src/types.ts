export type Destroyable = { destroy(): void };

export type EffectName =
  | "spotlight"
  | "trail"
  | "magnetic"
  | "ring"
  | "magnifier"
  | "invertRing";

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

export type MagnifierOptions = {
  size?: number;
  color?: string;
  borderWidth?: number;
  /** Follow smoothing 0–1, higher = snappier */
  smoothing?: number;
  /** 放大倍率（>=1），默认 1.6 */
  zoom?: number;
  /** 镜片 blur(px)，默认 6 */
  lensBlurPx?: number;
  /** 镜片亮度（CSS brightness），默认 1.15 */
  lensBrightness?: number;
  /** 镜片饱和度（CSS saturate），默认 1.25 */
  lensSaturate?: number;
  /** 镜片背景透明度（0-1），默认 0.06 */
  lensFillOpacity?: number;
};

export type InvertRingOptions = {
  size?: number;
  color?: string;
  borderWidth?: number;
  /** Follow smoothing 0–1, higher = snappier */
  smoothing?: number;
  /**
   * 反色混合模式（用于圈内的白色覆盖层）。
   * 默认 `"difference"`（白色 difference = 反色）。
   */
  blendMode?: string;
};
