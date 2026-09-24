# Chrome Web Store listing draft

[简体中文](STORE-LISTING.md) · English

This is copy to help fill out the developer dashboard. It does not mean the ZIP has been uploaded, submitted for review, or published. Check every field against the final ZIP, screenshots, and current dashboard before submitting.

## Listing

- Name: `Jsonora — JSON Viewer` (localized in the extension manifest)
- Suggested category: Developer Tools
- Short description: `View, edit, search, and visualize JSON in Chrome. Explore responses, local files, and code blocks with graph and tree views.`
- Full description:

> Jsonora makes JSON easier to read. When you open a JSON endpoint, the left pane retains syntax-highlighted raw content with line numbers and folding, while the right pane switches between a compact graph and a tree. You can also import local files, paste JSON, edit and search content, or expand JSON code blocks in place on web pages. The DevTools panel can inspect responses captured after it opens. English and Chinese interfaces, light and dark modes, and several theme families are available. JSON is processed locally in your browser; see the privacy notice for details.

- Website/source: [GitHub repository](https://github.com/sowen1023/Jsonora)
- Support: [GitHub Issues](https://github.com/sowen1023/Jsonora/issues)
- Privacy policy: [English](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.en.md) · [简体中文](https://github.com/sowen1023/Jsonora/blob/main/docs/PRIVACY.md)
- Icon: `src/icons/icon128.png`
- Screenshot candidate: `docs/store-screenshot-1280x800.png`. It shows synthetic example data but includes a local demo address at lower left. Replace it with a screenshot from the actual extension environment and inspect it before store upload.

## Draft privacy and permission explanations

- Single purpose: Let users view, edit, and visualize JSON they open or encounter in Chrome, with local processing.
- `<all_urls>` content-script matching: Detect JSON responses and JSON code blocks across websites. Page content is not intentionally sent to the developer. Restricted Chrome pages cannot be injected.
- `storage`: Save preferences and a temporary content handoff between the popup, context menu, DevTools panel, and standalone viewer. See the [privacy notice](PRIVACY.en.md).
- `contextMenus`: Open selected text in Jsonora from the right-click menu.
- `clipboardWrite`: Copy JSON at the user's request.
- Remote code: The current build does not execute remotely hosted code; verify this against the final ZIP before submission.

The dashboard's data-use checkboxes are formal declarations. Check the final code and [privacy notice](PRIVACY.en.md) field by field, and have the account holder confirm them before submission. Do not tick them automatically from this draft.

## Draft reviewer test instructions

No account or test credentials are needed. After installation, open an ordinary HTTPS endpoint that returns JSON, or click the extension icon and paste `{"name":"Ada","roles":["admin","editor"]}`. The left pane supports folding and editing raw JSON; the View menu switches the right pane between Graph and Tree. To test DevTools, open the Jsonora panel and then make a new request to inspect its JSON response. Chrome blocks injection into some internal pages by design.
