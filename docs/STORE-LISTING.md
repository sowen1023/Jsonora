# Chrome Web Store 提交资料草稿

简体中文 · [English](STORE-LISTING.en.md)

此页是填写开发者后台时的文字草稿，不代表已上传、提交审核或上架。提交前需根据最终 ZIP、截图和后台当前表单逐项核对。

## 商店资料

- 名称：`Jsonora — JSON 查看器`（已在扩展清单中为简体中文本地化）
- 分类建议：开发者工具
- 简短说明：`在 Chrome 中查看、编辑、搜索和可视化 JSON；用图形与树形视图阅读接口响应、本地文件和网页代码块。`
- 完整说明：

> Jsonora 让 JSON 更容易阅读。打开 JSON 接口时，左侧保留带语法高亮、行号和折叠功能的原始内容，右侧可以在紧凑图形与树形视图之间切换。你还可以导入本地文件、粘贴 JSON、编辑与搜索内容，或在网页上就地展开 JSON 代码块。DevTools 面板可查看打开面板后捕获的响应。支持中英文、明暗模式及多套配色。JSON 在本机浏览器中处理；详情请阅读隐私说明。

- 网站/源码：[GitHub 仓库](https://github.com/sowen1023/Jsonora)
- 支持：[GitHub Issues](https://github.com/sowen1023/Jsonora/issues)
- 隐私政策：[简体中文](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.md) · [English](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.en.md)
- 图标：`src/icons/icon128.png`
- 截图候选：`docs/store-screenshot-1280x800.png`。它来自合成示例页面，左下角有本地演示地址；正式上传前应替换成真实扩展环境截图并人工检查。

## 隐私与权限说明草稿

- 单一用途：在 Chrome 中本地查看、编辑和可视化用户主动打开或浏览的 JSON。
- `<all_urls>` 内容脚本匹配：识别不同网站上的 JSON 响应和 JSON 代码块。不会主动把页面内容发送给开发者；Chrome 内置页面等受限地址不能注入。
- `storage`：保存用户设置，以及从弹窗、右键菜单或 DevTools 面板向独立查看器传递内容的临时项。详情见[隐私说明](PRIVACY.md)。
- `contextMenus`：让用户从选中文本的右键菜单打开 Jsonora。
- `clipboardWrite`：让用户复制 JSON 内容。
- 远程代码：当前构建不执行远程托管代码；提交时再次检查最终 ZIP。

开发者后台的数据使用勾选属于正式声明。务必逐项核对最终代码与[隐私说明](PRIVACY.md)，由账号持有人确认后再提交，不要仅复制本页自动勾选。

## 审核测试说明草稿

无需账号或测试凭据。安装后打开一个返回 JSON 的普通 HTTPS 接口，或点击扩展图标粘贴示例 `{"name":"Ada","roles":["admin","editor"]}`。左侧可折叠、编辑原始 JSON；通过「视图」菜单在右侧图形与树形之间切换。打开 DevTools 的 Jsonora 面板后重新发起请求，可检查新捕获的 JSON 响应。某些浏览器内部页面不可注入，属 Chrome 限制。
