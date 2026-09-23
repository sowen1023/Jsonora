# Jsonora 标识

![Jsonora 标识](logo.svg)

标识以首字母 **J** 为主体，用一笔弯钩表达从文本走向结构的阅读路径；左侧的一枚赤陶色小方点像数据节点。新版改为暖纸底与深色字标，不使用渐变或高光，在浅色与深色浏览器工具栏上都保持清晰。这是为 Jsonora 画的原创图形，不使用参考品牌的字母轮廓或星形。

| 资产 | 用途 |
| --- | --- |
| [`logo.svg`](logo.svg) | 文档和需要矢量图的场景 |
| `src/icons/icon16.png` / `icon32.png` | 工具栏、页面图标、高密度屏幕 |
| `src/icons/icon48.png` / `icon128.png` | 扩展管理页、安装界面、Chrome Web Store |

底色为暖纸白 `#f7f4f0`，字形为深墨紫 `#2b2630`，小方点为赤陶红 `#c46059`，边线为 `#d9d0cb`。Logo 不随查看器的主题配色变化。四个 PNG 尺寸由 `npm run icons` 生成；修改 SVG 时，请同时更新 UI 的 `BrandMark` 和图标生成脚本。
