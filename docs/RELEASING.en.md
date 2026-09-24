# Packaging and publishing the Chrome extension

[简体中文](RELEASING.md) · English

Jsonora is a Manifest V3 extension. Load `dist/` locally; upload `jsonora-<version>.zip` to the Chrome Web Store. The ZIP must have `manifest.json` at its root. Packaging is not publication: a developer account, public listing assets, and privacy disclosures are also required.

`private: true` in `package.json` only prevents accidental npm publication. It does not affect the MIT license or Chrome Web Store distribution.

## Local packaging

You need npm, Node.js `^20.19.0` or `>=22.12.0`, and the system `zip` utility.

```bash
npm ci
npm run typecheck
npm test
npm run zip
unzip -l jsonora-0.1.2.zip
unzip -p jsonora-0.1.2.zip manifest.json
```

The archive name comes from `package.json`; the build script also copies that version into the packaged manifest. For future releases, bump the version in `package.json` and its lockfile first. If the logo changes, run `npm run icons` before packaging. `npm run zip` rebuilds `dist/` and writes the ZIP to the repository root, failing with a nonzero exit code if packaging fails.

In `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and point it to `dist/`. Rebuild and reload the extension after changing code. Do not select the repository root, the ZIP itself, or Chrome's temporary `UnpackedExtensions` directory; do not nest `dist/` inside the ZIP. If you only have the ZIP, extract it and select the folder containing `manifest.json`.

## Pre-release checklist

- Test in actual Chrome: a JSON API response, JSON `<pre>` on a regular page, paste/file import, raw editing, Graph/Tree switching, popup, context menu, DevTools panel, English/Chinese, and light/dark themes. A development-server preview does not replace extension testing.
- Check the packaged manifest name, description, icons, version, and minimum Chrome version. The four PNG icons are under `src/icons/`; the 128px version can also be used for store materials.
- Verify that the ZIP root includes `LICENSE` and `THIRD_PARTY_NOTICES.txt` for runtime dependencies.
- Check permissions against real behavior: `content_scripts.matches` covers ordinary websites to detect JSON responses and code blocks; `storage` saves settings and temporary content handoffs; `contextMenus` offers a selection entry point; `clipboardWrite` enables copying. Jsonora does not declare redundant `host_permissions`, but its broad content-script matching still needs an honest explanation in the store's Privacy section.
- Read the [privacy notice](PRIVACY.en.md), especially synced preferences and JSON that may remain in `chrome.storage.local` after an interrupted handoff. Store declarations must match actual behavior.
- Prepare a store description, category, languages, at least one **1280×800** screenshot, a 128×128 icon, and any other promotional assets the current dashboard requires. `docs/store-screenshot-1280x800.png` is a size sample made from synthetic data; review it against the final experience before upload. `docs/preview-*.png` are documentation illustrations and should not be uploaded without review.
- Provide a public [privacy policy URL](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.en.md) and check developer identity, support contact, and reviewer test instructions. Keep credentials and real user JSON out of the repository and screenshots.

## Submit to the Chrome Web Store

1. [Register and configure a developer account](https://developer.chrome.com/docs/webstore/register). Registration has a one-time fee and may require account verification.
2. Sign in to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), choose **Add new item**, and upload `jsonora-<version>.zip`.
3. Complete **Store listing** (description, language, images), **Privacy** (single purpose, permissions, data use, privacy policy), **Distribution**, and **Test instructions** if needed.
4. Resolve dashboard checks and choose **Submit for Review**. Publication timing after approval depends on whether you selected immediate or deferred publication.

The build script does not upload or submit anything automatically. Dashboard fields and asset rules can change; consult the official [preparation](https://developer.chrome.com/docs/webstore/prepare), [publishing](https://developer.chrome.com/docs/webstore/publish), and [listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) guides.

## Later updates

Bump the `package.json` version, rerun checks and `npm run zip`, then upload the new ZIP. Do not reuse a version already uploaded to the store. Recheck permissions, privacy disclosures, screenshots, and feature descriptions for every release.
