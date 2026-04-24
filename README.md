## magic-cursor-effect
[Preview website](https://dashuaibi.vip/magic-cursor)

- [English](#English)
- [中文](#中文)

## English
A lightweight TypeScript library for mouse cursor visual effects on the web. Mount multiple Canvas- and DOM-based pointer effects on any container through one `createEffect()` API, and tear them down cleanly with `destroy()` when you unmount or switch effects.

- **npm**: `magic-cursor-effect`
- **Repo**: `https://github.com/chase-si/magic-cursor`
- **Runtime**: Browser only (DOM / Canvas APIs)

### Install

```bash
npm i magic-cursor-effect
```

```bash
pnpm add magic-cursor-effect
```

```bash
yarn add magic-cursor-effect
```

### Quick start

```ts
import { createEffect } from "magic-cursor-effect";

const root = document.getElementById("stage")!;

const fx = createEffect("trail", root, {
  color: "rgba(236, 72, 153, 0.5)",
  maxDots: 24,
  size: 24,
  throttleMs: 12,
});

// Always destroy on unmount / effect switch
fx.destroy();
```

### API

#### `createEffect(name, target?, options?)`

- **name**: effect name (see the list below)
- **target**: mount root element (defaults to `document.body`)
- **options**: effect-specific options (fully typed)
- **returns**: `{ destroy(): void }`

Exported types include `EffectName`, `Destroyable`, and per-effect `*Options` (e.g. `TrailOptions`).

### Effects (EffectName)

- **`spotlight`**: spotlight mask (Canvas)
  - `radius?: number`
  - `dimColor?: string` (rgba)
- **`trail`**: cursor trail (Canvas)
  - `maxDots?: number`
  - `color?: string`
  - `size?: number`
  - `throttleMs?: number`
- **`flame`**: flame particles (Canvas)
  - `emission?: number`
  - `size?: number`
  - `lifeMs?: number`
  - `rise?: number`
  - `jitter?: number`
  - `maxDpr?: number`
- **`smoke`**: ribbon smoke (Canvas)
  - `emission?: number`
  - `size?: number`
  - `lifeMs?: number`
  - `rise?: number`
  - `drift?: number`
  - `color?: string`
- **`magnetic`**: magnetic hover (DOM)
  - `strength?: number` (0–1)
  - `selector?: string` (default `"[data-magnetic]"`)
- **`ring`**: follow ring (Canvas)
  - `size?: number`
  - `color?: string`
  - `borderWidth?: number`
  - `smoothing?: number` (0–1)
- **`magnifier`**: magnifier (static snapshot + lens zoom)
  - `size?: number`
  - `zoom?: number` (>= 1)
  - `lensBlurPx?` / `lensBrightness?` / `lensSaturate?` / `lensFillOpacity?`
- **`invertRing`**: inverted ring (in-ring invert via `mix-blend-mode`)
  - `size?: number`
  - `blendMode?: string` (default `"difference"`)

### Framework / SSR notes

- **Browser-only**: for SSR apps (e.g. Next.js), mount effects on the client only (`useEffect`, `onMounted`, or dynamic import with `ssr:false`).
- **Avoid double-mount**: call `destroy()` before re-mounting to prevent duplicated listeners / leftover layers.
- **`magnifier` / `invertRing` snapshot**: the content snapshot is taken on mount; if your content changes dynamically, re-mount to refresh.

### Development (this repo)

```bash
npm i
```

```bash
npm run dev
```

```bash
npm run dev:build
```

```bash
npm run build
```


## 中文
轻量的 Web 鼠标指针效果库（TypeScript）。通过一个统一的 `createEffect()` API，把多种 Canvas/DOM 指针效果挂载到任意容器，并在卸载时用 `destroy()` 干净清理。

- **npm**：`magic-cursor-effect`
- **Repo**：`https://github.com/chase-si/magic-cursor`
- **Runtime**：Browser only（依赖 DOM/Canvas）
### 安装

```bash
npm i magic-cursor-effect
```

```bash
pnpm add magic-cursor-effect
```

```bash
yarn add magic-cursor-effect
```

### 快速开始

```ts
import { createEffect } from "magic-cursor-effect";

const root = document.getElementById("stage")!;

const fx = createEffect("trail", root, {
  color: "rgba(236, 72, 153, 0.5)",
  maxDots: 24,
  size: 24,
  throttleMs: 12,
});

// 卸载/切换效果时务必销毁
fx.destroy();
```

### API

#### `createEffect(name, target?, options?)`

- **name**：效果名（见下方「效果列表」）
- **target**：挂载根容器（默认 `document.body`）
- **options**：各效果专属参数（TypeScript 会给出提示）
- **返回值**：`{ destroy(): void }`

同时导出类型：`EffectName`、`Destroyable` 以及各效果的 `*Options`（例如 `TrailOptions`）。

### 效果列表（EffectName）

所有效果都通过 `createEffect(name, target?, options?)` 创建。

- **`spotlight`**：聚光灯遮罩（Canvas）
  - `radius?: number`
  - `dimColor?: string`（rgba）
- **`trail`**：拖尾（Canvas）
  - `maxDots?: number`
  - `color?: string`
  - `size?: number`
  - `throttleMs?: number`
- **`flame`**：火焰粒子（Canvas）
  - `emission?: number`
  - `size?: number`
  - `lifeMs?: number`
  - `rise?: number`
  - `jitter?: number`
  - `maxDpr?: number`
- **`smoke`**：丝带烟雾（Canvas）
  - `emission?: number`
  - `size?: number`
  - `lifeMs?: number`
  - `rise?: number`
  - `drift?: number`
  - `color?: string`
- **`magnetic`**：磁吸（DOM）
  - `strength?: number`（0–1）
  - `selector?: string`（默认 `"[data-magnetic]"`）
- **`ring`**：跟随圆环（Canvas）
  - `size?: number`
  - `color?: string`
  - `borderWidth?: number`
  - `smoothing?: number`（0–1）
- **`magnifier`**：放大镜（基于静态快照的圈内放大）
  - `size?: number`
  - `zoom?: number`（>= 1）
  - `lensBlurPx?` / `lensBrightness?` / `lensSaturate?` / `lensFillOpacity?`
- **`invertRing`**：反色圆环（圈内反色，基于 `mix-blend-mode`）
  - `size?: number`
  - `blendMode?: string`（默认 `"difference"`）

### 框架/SSR 注意事项

- **仅浏览器环境**：在 SSR（例如 Next.js）中请只在客户端挂载（`useEffect` / `onMounted` / 动态导入 `ssr:false`）。
- **不要重复挂载**：重复创建前先 `destroy()`，避免事件监听/层叠节点残留。
- **`magnifier` / `invertRing` 的内容快照**：当前为挂载时的静态快照；如果容器内容会频繁变化，需要重新挂载以更新快照。

### 本仓库开发

```bash
npm i
```

```bash
npm run dev
```

```bash
npm run dev:build
```

```bash
npm run build
```

产物输出到 `dist/`（ESM/CJS + d.ts）。

---