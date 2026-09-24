# Jsonora privacy notice

[简体中文](PRIVACY.md) · English

Last updated: 2026-09-24

Jsonora exists to parse, edit, and visualize JSON that you are viewing, pasting, or selecting in your browser. The current version has no developer-operated server, account system, ads, telemetry, or analytics. The extension does not intentionally upload JSON content to the Jsonora developer.

## Data the extension can access

- To identify JSON responses and JSON code blocks, its content script runs on websites where Chrome permits injection and reads eligible page text. You can also choose to paste JSON, open a local file, select text on a page, or open a response body from the DevTools panel.
- Parsing, searching, editing, copying, and downloading happen in your local browser. Copying writes the selected content to your system clipboard; downloading saves it to a local location you choose.
- To pass JSON from the popup, context menu, or DevTools panel to the standalone viewer, the extension temporarily stores the content in the `jsonora.pending` entry of `chrome.storage.local`. The viewer deletes this entry after reading it successfully. If that handoff is interrupted, the entry may remain until it is overwritten, you clear the extension's storage, or you uninstall the extension.
- Appearance, language, editing, and display preferences are stored in `chrome.storage.sync`, falling back to `chrome.storage.local` if sync is unavailable. If Chrome sync is enabled, these preferences may sync between your own Chrome environments. JSON document contents are not written to `chrome.storage.sync`.

## Permissions

`content_scripts.matches` uses `<all_urls>` so Jsonora can detect JSON responses and code blocks across websites; it does not take over every page. The `storage` permission saves preferences and the temporary handoff described above. `contextMenus` provides “View selected JSON with Jsonora.” `clipboardWrite` enables JSON copying. Chrome does not permit content scripts on restricted pages such as Chrome's internal pages.

## Retention and deletion

JSON in the viewer is primarily held in the current page's memory and is not saved as a history after you close the page. The `jsonora.pending` handoff entry is an exception and may remain in extension-local storage as described above. You can clear Jsonora's site/extension data in Chrome's extension management UI or uninstall it to remove local storage. If preferences were synced, manage the remote copy through your Chrome account's sync settings.

This notice describes the current source implementation. If a future release adds network services or analytics, or changes data handling, this notice and the store disclosures should be updated before publication. The public copy is in the [GitHub repository](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.en.md). For privacy questions, open a [GitHub Issue](https://github.com/sowen1023/Jsonora/issues) without attaching sensitive JSON or personal information.
