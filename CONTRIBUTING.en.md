# Contributing to Jsonora

[简体中文](CONTRIBUTING.md) · English

Bug reports, usability feedback, and code improvements are welcome. For an issue, include your Chrome version, reproduction steps, and expected and actual results. Use synthetic or redacted JSON; never upload production responses, access tokens, or personal information.

## Local development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

You can preview the main UI with `npm run dev`. To verify the content script, popup, and DevTools panel, load `dist/` at `chrome://extensions`. See the [development guide](docs/DEVELOPMENT.en.md) for code layout and icon generation, and the [release guide](docs/RELEASING.en.md) for packaging.

Keep each change focused, and include relevant tests or manual verification notes. Update the documentation when behavior or interaction changes. By contributing, you agree that your contribution will be released under the project's [MIT License](LICENSE); make sure you have the right to submit any code or assets you use.
