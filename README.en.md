<p align="center">
  <img src="docs/logo.svg" width="80" height="80" alt="Jsonora logo" />
</p>

<h1 align="center">Jsonora</h1>

<p align="center"><a href="README.md">简体中文</a> · English</p>

<p align="center">Turn a wall of JSON text into a structure you can actually read.</p>

<p align="center">Chrome extension · Raw JSON / Graph / Tree · Local processing · MIT licensed</p>

![Jsonora split-pane workspace](docs/preview-current.png)

Jsonora opens a split-pane workspace on JSON response pages: editable, foldable raw JSON on the left, and a compact graph or virtualized tree on the right. You can also expand JSON code blocks in ordinary web pages. The interface supports English and Chinese, plus several light and dark themes.

## Where to start

| What you want to do | Entry point |
| --- | --- |
| Read an API's JSON response | Open the API URL to see raw JSON alongside a structural view |
| Inspect pasted data or a local file | Use File → Paste / Open File, or drag in a `.json` file |
| Read JSON examples on a web page | Click the rendering prompt to expand eligible code blocks in place |
| Find a deeply nested field | Search plain text or regex, reveal its path in the graph/tree, and inspect its details |
| Debug network responses | Open the Jsonora panel in Chrome DevTools |

The tolerant parser handles common inputs such as comments, trailing commas, single quotes, JSONP, and NDJSON. It reports the location of errors it cannot recover from. The graph defaults to compact cards, with the canvas grid off. Views, fonts, and themes are configurable. See the [user guide](docs/USAGE.en.md) for details.

## Try it locally

Jsonora is not yet on the Chrome Web Store. Until then, load it from source. You need Node.js `^20.19.0` or `>=22.12.0`:

```bash
npm ci
npm run build
```

In `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this project's `dist/` directory. Do not select the ZIP itself or Chrome's temporary `UnpackedExtensions` directory. Then open a JSON endpoint or click the extension icon to paste JSON. Rebuild and reload the extension after changing source code. If you only have a release ZIP, extract it first and select the folder containing `manifest.json`.

Run `npm run zip` to create a ZIP for the Chrome Web Store. The [release guide](docs/RELEASING.en.md) covers the submission checklist; building a ZIP does not publish the extension.

## Documentation

- [User guide](docs/USAGE.en.md): views, editing, search, shortcuts, and limits
- [Development guide](docs/DEVELOPMENT.en.md): environment, commands, architecture, and verification
- [Packaging and release](docs/RELEASING.en.md): Chrome Web Store submission checklist
- [Store listing draft](docs/STORE-LISTING.en.md): bilingual copy, permission rationale, and reviewer steps
- [Privacy notice](docs/PRIVACY.en.md): page data, temporary storage, and permissions
- [Brand and logo](docs/BRAND.en.md): vector artwork, PNG icons, and colors
- [Design brief](docs/DESIGN-BRIEF.en.md): historical internal design reference
- [Contributing](CONTRIBUTING.en.md): reporting issues and submitting code

Please use [GitHub Issues](https://github.com/sowen1023/Jsonora/issues) for feedback. Do not attach real API responses or credentials.

Jsonora parses JSON locally in your browser. It briefly uses extension-local storage when moving content between extension pages, and preferences may use Chrome sync storage. Read the [privacy notice](docs/PRIVACY.en.md) for the exact boundaries.

## License

The source code and accompanying documentation are released under the [MIT License](LICENSE). The release ZIP also includes `THIRD_PARTY_NOTICES.txt` for runtime dependencies.
