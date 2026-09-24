# 开发 Jsonora

简体中文 · [English](DEVELOPMENT.en.md)

Jsonora 是 Chrome Manifest V3 扩展。查看器 UI 使用 Preact、TypeScript 和 Vite；JSON 解析、格式化、模型与图形布局在 `src/core/` 中，与浏览器 API 分离。

## 环境与命令

需要 Node.js `^20.19.0` 或 `>=22.12.0`（由当前 Vite 版本要求），以及 npm。

```bash
npm ci
npm run dev        # 普通浏览器里预览 UI；设置存在 localStorage
npm run typecheck
npm test
npm run icons      # 从代码重新生成 16/32/48/128 PNG
npm run build      # 生成可在 Chrome 加载的 dist/
npm run zip        # 构建并生成 jsonora-<version>.zip
```

`npm run dev` 不是完整扩展环境，不能代替在 Chrome 中测试内容脚本、弹窗、右键菜单和 DevTools 面板。完整测试请按 [发布检查](RELEASING.md#发布前检查) 加载 `dist/`。

本地测试页面可用 `npm run fixtures` 启动；已有的 `tools/cdp-shot.mjs` 可对 `/harness/auto` 截图。给它传 `--width 1280 --height 800 --scale 1` 可生成商店要求的 1280×800 尺寸，但测试页面的截图仍需在提交前人工复核。

## 代码导航

| 目录 | 作用 |
| --- | --- |
| `src/core/` | 容错解析、扁平树模型、高亮、格式化、搜索、图形布局 |
| `src/ui/` | Preact 查看器、原始/树形/图形视图、设置与设计变量 |
| `src/content/` | 页面检测与 Shadow DOM 注入 |
| `src/pages/` | 独立查看器、弹窗、设置页、DevTools 面板 |
| `src/background/` | Manifest V3 service worker 与右键菜单 |
| `src/platform/` | Chrome API 探测、设置存储和跨上下文临时数据交接 |
| `tools/` | 图标生成、扩展构建、测试页面与截图辅助 |

构建分三次进行：扩展页面使用 ES modules；内容脚本和 service worker 分别打成单个 classic script。内容脚本把样式注入 Shadow DOM，因此不会借用宿主网页的 CSS。
发布包还会包含项目 MIT 协议，以及从 lockfile 中运行时依赖（包括随包提供的 OFL 字体）的许可文本生成的 `THIRD_PARTY_NOTICES.txt`。代码字体仅打包 Latin WOFF2 子集，中文字符由系统字体回退显示。

## 修改图标

Logo 的矢量稿在 [`logo.svg`](logo.svg)，UI 内联版本在 `src/ui/Icons.tsx` 的 `BrandMark`，Chrome 所需 PNG 由 `tools/gen-icons.mjs` 生成。改动 Logo 时同步修改三者，运行 `npm run icons`，在 16px 和 128px 尺寸下都检查清晰度。Chrome 清单不接受 SVG 图标。

## 提交前

运行 `npm run typecheck`、`npm test`、`npm run build`；涉及内容脚本或权限时还要在真实 Chrome 扩展环境中复测。不要把 `dist/`、ZIP、用户 JSON、测试凭据或 Chrome Web Store 凭据提交到仓库。界面或发布流程改变时同步更新对应文档。
