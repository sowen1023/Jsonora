# Jsonora 隐私说明

最后更新：2026-09-23

Jsonora 的用途是把用户正在查看、粘贴或选择的 JSON 在浏览器中解析、编辑并可视化。当前版本没有开发者运营的服务器、账号、广告、遥测或分析功能；扩展代码不会主动将 JSON 内容上传给 Jsonora 开发者。

## 扩展会接触哪些数据

- 为识别 JSON 响应和页面中的 JSON 代码块，内容脚本会在允许注入的网页上运行，并读取符合条件的页面文本。用户也可以主动粘贴 JSON、打开本地文件、选择网页文本，或从 DevTools 面板打开响应体。
- 解析、搜索、编辑、复制和下载都在本机浏览器中完成。点击复制会把所选内容写入系统剪贴板；点击下载会保存到用户选择的本地位置。
- 在弹窗、右键菜单或 DevTools 面板与独立查看器之间传递 JSON 时，扩展会把待打开内容临时放入 `chrome.storage.local` 的 `jsonora.pending` 项。查看器成功读取后会删除该项；如果流程中断，内容可能保留，直到下一次覆盖、手动清除扩展存储或卸载扩展。
- 外观、语言、编辑和显示偏好保存在 `chrome.storage.sync`（不可用时回退到 `chrome.storage.local`）。启用 Chrome 同步的浏览器可能在用户自己的 Chrome 环境间同步这些偏好；JSON 正文不写入 `chrome.storage.sync`。

## 权限说明

`content_scripts.matches` 使用 `<all_urls>`，以便在不同站点识别 JSON 响应和 JSON 代码块；这不代表每个网页都会被接管。`storage` 用于保存偏好与上述临时交接内容；`contextMenus` 用于“用 Jsonora 查看选中的 JSON”；`clipboardWrite` 用于复制 JSON。Chrome 内置页面等受限页面不允许内容脚本运行。

## 保留与删除

查看器中的 JSON 主要保留在当前页面内存中，关闭页面后不作为历史记录保存。待交接的 `jsonora.pending` 是例外，可能按上文所述残留在扩展本地存储。可以在 Chrome 扩展管理界面清除 Jsonora 的站点/扩展数据，或卸载扩展以移除其本地存储；若偏好曾同步，还应按 Chrome 账号的同步设置管理云端数据。

此说明仅描述当前源码实现。若将来加入联网服务、分析功能或改变数据处理方式，发布前应先更新本说明和商店数据披露。公开版本位于 [GitHub 仓库](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.md)；有关隐私的问题可在 [Issues](https://github.com/sowen1023/Jsonora/issues) 提出，请勿附上敏感 JSON 或个人信息。
