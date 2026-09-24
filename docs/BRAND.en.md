# Jsonora brand mark

[简体中文](BRAND.md) · English

![Jsonora mark](logo.svg)

The mark centers on the letter **J**. Its curved stroke suggests a reading path from text into structure, while the small terracotta square on the left evokes a data node. The current artwork uses a warm-paper background and dark letterform, without gradients or gloss, so it remains legible on light and dark browser toolbars. It is original artwork for Jsonora and does not reuse the letterform or star of a reference brand.

| Asset | Use |
| --- | --- |
| [`logo.svg`](logo.svg) | Documentation and vector applications |
| `src/icons/icon16.png` / `icon32.png` | Toolbar, page icon, high-density screens |
| `src/icons/icon48.png` / `icon128.png` | Extension management, install UI, Chrome Web Store |

The background is warm paper `#f7f4f0`, the letterform is dark ink-purple `#2b2630`, the square is terracotta `#c46059`, and the border is `#d9d0cb`. The logo does not change with the viewer theme. Generate the four PNG sizes with `npm run icons`. When editing the SVG, also update the UI `BrandMark` and the icon-generation script.
