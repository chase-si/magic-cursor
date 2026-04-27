export type Destroyable = { destroy(): void };

export type EffectName =
  | "spotlight"
  | "trail"
  | "magnetic"
  | "ring"
  | "magnifier"
  | "invertRing"
  | "flame"
  | "smoke";

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
  /**
   * 与 `blendMode` 叠加的纯色/半透明底（圈内 `invertLayer` 的 background）。
   * 不传时按 `blendMode` 选一个较合理的默认值（例如 `difference`→白、`screen`→黑）。
   */
  blendBackground?: string;
  /**
   * 为 true（默认）时，用 `elementFromPoint` 判断指针下最顶层节点是否在 `root` 内，
   * 避免全屏遮罩、侧栏等盖住 `root` 时效果仍显示。
   */
  respectPointerOcclusion?: boolean;
  /**
   * `viewport` 的 z-index；`canvas` 描边为其 +1。默认 `2147482999`。
   * 若希望效果叠在自定义浮层之下，请把浮层 z-index 设得更高，或把本值调低。
   */
  layerZIndex?: number;
};

export type FlameOptions = {
  /** 粒子发射强度（每次移动生成数量），默认 2 */
  emission?: number;
  /** 粒子大小（px），默认 10 */
  size?: number;
  /** 粒子寿命（ms），默认 700 */
  lifeMs?: number;
  /** 上升速度（px / frame），默认 1.6 */
  rise?: number;
  /** 横向抖动幅度（px / frame），默认 0.9 */
  jitter?: number;
  /** DPR 上限（降低高分屏开销），默认 2 */
  maxDpr?: number;
};

export type SmokeOptions = {
  /** 粒子发射强度（每次移动生成数量），默认 2 */
  emission?: number;
  /** 粒子大小（px），默认 18 */
  size?: number;
  /** 粒子寿命（ms），默认 1400 */
  lifeMs?: number;
  /** 上升速度（px / frame），默认 0.8 */
  rise?: number;
  /** 横向飘动幅度（px / frame），默认 0.7 */
  drift?: number;
  /** 烟雾颜色（rgba），默认 `rgba(226,232,240,0.18)` */
  color?: string;
};
