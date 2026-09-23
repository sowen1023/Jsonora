# 参与 Jsonora

感谢关注 Jsonora。欢迎提交错误报告、体验建议和代码改进。提交问题时请说明 Chrome 版本、复现步骤、期望与实际结果；请使用脱敏或合成 JSON，不要上传生产响应、访问令牌或个人信息。

## 本地开发

```bash
npm ci
npm run typecheck
npm test
npm run build
```

普通界面可用 `npm run dev` 预览；内容脚本、弹窗和 DevTools 面板请在 `chrome://extensions` 中加载 `dist/` 验证。代码结构和图标生成见 [开发文档](docs/DEVELOPMENT.md)，发布流程见 [发布文档](docs/RELEASING.md)。

改动请尽量聚焦一个问题，附上必要测试或手工验证说明；交互或行为变化时同步更新相关文档。向本项目贡献代码，表示你同意该贡献以项目的 [MIT License](LICENSE) 发布；请确保你有权提交所用代码和素材。
