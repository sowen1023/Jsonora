# 打包与发布 Chrome 扩展

简体中文 · [English](RELEASING.en.md)

Jsonora 是 Manifest V3 扩展。`dist/` 用于本地加载，`jsonora-<version>.zip` 用于上传 Chrome Web Store；ZIP 内的 `manifest.json` 必须在压缩包根目录。打包不等于已经上架，商店提交还需要开发者账号、公开素材与隐私声明。

`package.json` 中的 `private: true` 只阻止意外发布到 npm，不妨碍源码按 MIT 开源，也不妨碍将 ZIP 发布到 Chrome Web Store。

## 本地打包

需要 Node.js `^20.19.0` 或 `>=22.12.0`、npm，以及系统 `zip` 命令。

```bash
npm ci
npm run typecheck
npm test
npm run zip
unzip -l jsonora-0.1.2.zip
unzip -p jsonora-0.1.2.zip manifest.json
```

文件名里的版本来自 `package.json`，构建脚本会同步写入打包后的 manifest；以后发布新版本时，先修改 `package.json` 的版本号和对应的 lockfile，再重新运行命令。若修改了 Logo，先执行 `npm run icons` 重新生成四种 PNG 图标。`npm run zip` 会重新构建 `dist/`，并在项目根目录生成 ZIP；打包失败会返回非零状态。

在 `chrome://extensions` 开启「开发者模式」，选择「加载已解压的扩展程序」，指向 `dist/`。改代码后重新构建并在扩展列表中刷新。不要选择项目根目录、ZIP 文件或 Chrome 的临时 `UnpackedExtensions` 目录，也不要把 `dist/` 文件夹本身再包一层放进 ZIP。如果只有 ZIP，先解压并选择包含 `manifest.json` 的目录。

## 发布前检查

- 在真实 Chrome 中试用：普通 JSON 接口、普通网页里的 JSON `<pre>`、粘贴/文件导入、原始视图编辑、图形/树形切换、弹窗、右键菜单、DevTools 面板、中英文及明暗模式。开发服务器的预览不能代替扩展环境。
- 核对 `manifest.json` 的名称、说明、图标、版本与最小 Chrome 版本。四种图标是 `src/icons/` 中的 PNG；128px 图标也可用于商店资料。
- 确认 ZIP 根目录包含项目 `LICENSE` 与构建时从运行时依赖生成的 `THIRD_PARTY_NOTICES.txt`。
- 核对扩展权限与实际行为：`content_scripts.matches` 覆盖常规网站，以便识别 JSON 响应和页内代码块；`storage` 保存设置及临时交接内容；`contextMenus` 提供选中文本入口；`clipboardWrite` 用于复制。扩展不另行声明冗余的 `host_permissions`；面向所有网站的内容脚本匹配范围仍会产生较宽的访问提示，应在商店隐私栏如实解释。
- 阅读并核对 [隐私说明](PRIVACY.md)，特别是 `chrome.storage.sync` 中的设置以及 `chrome.storage.local` 中可能残留的待打开 JSON。商店资料与实际行为必须一致。
- 准备商店说明、分类、语言、至少一张 **1280×800** 截图、128×128 图标，以及开发者后台当前要求的其他宣传素材。`docs/store-screenshot-1280x800.png` 是用合成示例数据生成的尺寸样例，上传前仍要核对它是否准确代表最终扩展体验；`docs/preview-*.png` 是文档配图，不要直接上传。
- 准备公开可访问的[隐私政策 URL](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.md)；检查开发者身份、支持联系方式及测试说明。不要将测试凭据或用户真实 JSON 写进仓库或截图。

## 提交到 Chrome Web Store

1. 注册并配置 [Chrome Web Store 开发者账号](https://developer.chrome.com/docs/webstore/register)。账号注册有一次性费用；发布前按后台要求完成验证。
2. 登录 [Developer Dashboard](https://chrome.google.com/webstore/devconsole)，选择 **Add new item**，上传 `jsonora-<version>.zip`。
3. 填写 **Store listing**（描述、语言、截图等）、**Privacy**（单一用途、权限理由、数据使用、隐私政策）、**Distribution**，以及需要时的 **Test instructions**。
4. 完成后台检查后选择 **Submit for Review**。审核通过后的发布时间取决于你在提交时选择立即发布还是延后发布。

构建脚本不会自动上传或提交审核。商店 UI 与素材要求可能变化，以 [Chrome 官方准备指南](https://developer.chrome.com/docs/webstore/prepare)、[发布指南](https://developer.chrome.com/docs/webstore/publish)和[商店资料指南](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)为准。

## 后续更新

先提高 `package.json` 中的版本号，再执行检查和 `npm run zip`，上传新的 ZIP。不要复用已经上传的版本号。更新时再次核对权限、隐私声明、截图与功能描述。
