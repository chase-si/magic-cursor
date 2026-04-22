# magic-cursor 开发上下文（由项目计划整理）

本文档把「产品目标 + 技术约定 + 目录与命令」固化成后续迭代时可读的上下文，**不替代**仓库根目录的 [`README.md`](../README.md)。权威 API 以 [`dist/index.d.ts`](../dist/index.d.ts)（构建后）或 [`src/index.ts`](../src/index.ts) 为准。

---

## 1. 目标

1. **可发布 npm 的包**：`package.json` 含 `exports` / `types` / `files`，发版前 `prepublishOnly` 执行构建。
2. **鼠标指针相关的悬浮 / 移动视觉效果**：挂载在指定容器或整页（默认 `document.body`）。
3. **演示页**：[`demo/index.html`](../demo/index.html) 展示并切换所有内置效果；开发用 Vite 别名指向源码，静态构建输出到 `demo-dist/`。

---

## 2. 技术选型

| 项 | 选择 | 说明 |
|----|------|------|
| 语言 | TypeScript | 导出类型定义 |
| 库构建 | [tsup](https://github.com/egoist/tsup) | ESM + CJS + `.d.ts` / `.d.cts` |
| 演示 | Vite | 仅用于 demo，与库构建解耦 |
| 运行时依赖 | 无 | 不引入 React / Vue |

样式：各 effect 在模块内通过 `style` / 注入节点完成；计划中可选的 `inject-styles.ts`**当前未实现**，若需统一主题可后续补。

---

## 3. 仓库结构（与计划对照）

```
magic-cursor/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vite.config.ts          # demo 根目录与 magic-cursor → src 别名
├── src/
│   ├── index.ts            # createEffect + 类型再导出
│   ├── types.ts
│   └── effects/
│       ├── spotlight.ts          # 委托 canvas 实现
│       ├── spotlight-canvas.ts
│       ├── trail.ts
│       ├── magnetic.ts
│       └── ring.ts
├── demo/
│   ├── index.html
│   └── demo.ts
├── dist/                   # 构建产物（gitignore）
├── demo-dist/              # 演示静态构建（gitignore）
└── docs/
    └── PLAN_CONTEXT.md     # 本文件
```

---

## 4. 公共 API 约定

### 已实现

- **`createEffect(name, target?, options?)`** → `{ destroy(): void }`
  - `target` 省略时为 `document.body`。
  - 切换效果前应对上一次返回值调用 **`destroy()`**，避免重复监听与 DOM 残留。
  - 非浏览器环境（无 `document`）会抛错。

### 计划中曾提及、未实现（可选扩展）

- **`MagicCursor.init({ effect, root, ... })`**：单一配置对象入口；若需要可与 `createEffect` 并存或作为薄封装。

### 效果名与职责

| `EffectName` | 模块 | 要点 |
|--------------|------|------|
| `spotlight` | `spotlight.ts` → `spotlight-canvas.ts` | **Canvas**（rAF + 位图、`ResizeObserver`、DPR 上限） |
| `trail` | `effects/trail.ts` | 节流加点、`rAF` 淡出、数量上限 |
| `magnetic` | `effects/magnetic.ts` | 对 `selector`（默认 `[data-magnetic]`）内元素做 `translate` |
| `ring` | `effects/ring.ts` | 环形跟随 + lerp；`pointerdown` 缩放反馈 |

每个 effect 对外通过 `src/index.ts` 暴露；内部实现保持 **`mount(root, options?) → { destroy }`** 的契约，便于测试与扩展。

---

## 5. 命令

| 命令 | 作用 |
|------|------|
| `npm run build` | 构建库到 `dist/` |
| `npm run demo` | 启动演示（Vite dev） |
| `npm run demo:build` | 演示打包到 `demo-dist/` |
| `npm pack --dry-run` | 检查发布包文件列表 |

发 npm：`npm publish`（会触发 `prepublishOnly` → `build`）。

---

## 6. 风险与约定（延续计划）

- **全局单例**：全屏级效果（如 ring 隐藏光标）同一时间只挂载一种；文档与用户侧需强调先 `destroy`。
- **SSR**：仅客户端使用；入口已对 `document` 做检查。
- **演示切换**：见 [`demo/demo.ts`](../demo/demo.ts) — 先 `destroy` 再 `createEffect`。

---

## 7. 后续开发可做的事（非必须）

- 增加 `inject-styles.ts` 或独立 `style.css` 供按需引入。
- 为 `MagicCursor.init` 提供兼容层或文档示例。
- 新 effect：在 `src/effects/` 新增模块，扩展 `EffectName` 与 `createEffect` 的重载。
- 根目录 README：补充安装一行、`createEffect` 最小示例（与历史计划「可选补充」一致）。

---

*文档生成依据：项目搭建计划与当前代码结构；若实现变更，请同步更新本节与「已实现 / 未实现」描述。*
