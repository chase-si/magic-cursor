## magic-cursor-effect

一个轻量的 Web 鼠标指针效果库（TypeScript），提供多种可挂载在任意容器上的视觉效果，并内置 demo 页面用于快速预览与调参。

## 安装

> 当前仓库用于开发/构建。若你已经发布到 npm，可按你实际的包名安装。

```bash
npm i <your-package-name>
```

## 快速开始

```ts
import { createEffect } from "<your-package-name>";

const root = document.getElementById("stage")!;
const fx = createEffect("trail", root, {
  color: "rgba(236, 72, 153, 0.5)",
  maxDots: 24,
  size: 24,
});

// 切换/卸载时务必销毁
fx.destroy();
```

## 支持的效果

所有效果都通过 `createEffect(name, target?, options?)` 创建，并返回 `{ destroy() }`。

- **`spotlight`**：聚光灯遮罩（Canvas）
  - `radius?: number`
  - `dimColor?: string`
- **`trail`**：拖尾（Canvas）
  - `maxDots?: number`
  - `color?: string`
  - `size?: number`
  - `throttleMs?: number`
- **`magnetic`**：磁吸（DOM）
  - `strength?: number`
  - `selector?: string`（默认 `"[data-magnetic]"`）
- **`ring`**：跟随圆环（Canvas）
  - `size?: number`
  - `color?: string`
  - `borderWidth?: number`
  - `smoothing?: number`
- **`magnifier`**：放大镜（圈内真实放大，静态快照 + 放大定位）
  - `size?: number`
  - `zoom?: number`
  - 以及镜片质感参数：`lensBlurPx` / `lensBrightness` / `lensSaturate` / `lensFillOpacity`
- **`invertRing`**：反色圆环（圈内反色，基于 `mix-blend-mode`）
  - `size?: number`
  - `blendMode?: string`（默认 `"difference"`）
- **`flame`**：火焰粒子（Canvas）
  - `emission?: number`
  - `size?: number`
  - `lifeMs?: number`
  - `rise?: number`
  - `jitter?: number`
- **`smoke`**：丝带烟雾（Canvas，跟随方向惯性扩散）
  - `emission?: number`
  - `size?: number`
  - `lifeMs?: number`
  - `rise?: number`
  - `drift?: number`
  - `color?: string`

## Demo

运行本地演示（Vite）：

```bash
yarn demo
```

构建演示：

```bash
yarn demo:build
```

## 构建库

```bash
yarn build
```

产物输出到 `dist/`（ESM/CJS + d.ts）。

## 注意事项

- **必须在浏览器环境中使用**：依赖 DOM/Canvas API。
- **重复挂载前请先 destroy**：避免事件监听重复与 DOM/Canvas 残留。
- **`magnifier`/`invertRing` 的“内容快照”**：当前实现为挂载时静态克隆 root 内容；如果你的内容会动态变化，需要重新挂载或后续扩展 refresh 机制。