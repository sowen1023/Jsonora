# Using Jsonora

[简体中文](USAGE.md) · English

The main workspace always shows JSON on the left: single-line input is formatted automatically, while copying and downloading still use the original source. The Graph/Tree pane starts collapsed; open it from View or the right-hand rail. Once open, either pane can be collapsed and the divider can be dragged to resize them.

## Start with your task

| What you want to do | Where to start |
| --- | --- |
| Read an API's JSON response | Open the endpoint; Jsonora displays formatted JSON when it detects a response |
| Inspect a JSON example on a web page | Click the rendering prompt in the lower-right corner to expand eligible `<pre>` blocks in place |
| Check JSON on the clipboard | Paste in the viewer, or use Quick Paste from the extension popup |
| Open a local `.json` file | Use File → Open File or drag the file into the viewer; `file://` pages require separate Chrome permission |
| Debug a response | Open the Jsonora DevTools panel; it only sees requests made after the panel opens |

![Jsonora split-pane workspace](preview-current.png)

## Raw JSON and editing

The left pane offers syntax highlighting, line numbers, and folding for objects and arrays. Click the small square beside a line number to collapse a structure without deleting its contents. File → Edit JSON opens an editable version; syntax errors are reported before changes are applied. You can press `⌘/Ctrl + Enter` to apply an edit.

The File menu also lets you paste, copy, and download JSON. Automatic formatting changes only the display; copy and download still use the original input. Explicit formatting, minifying, or applying an edit changes the content used afterward. Search supports plain text, regular expressions, case sensitivity, and showing only matches.

## Graph and Tree

The View menu selects only the right-hand Graph or Tree view:

- Graph defaults to compact cards: an object's direct fields share a card, and nested objects can be expanded via connectors. Use the upper-right control to switch to individual nodes.
- Tree uses virtual scrolling for long JSON documents. Expansion, selection, and inspection work across both structural views.
- Drag to pan the graph canvas and scroll to zoom. Zoom and fit-to-window controls sit in the lower-right corner. The optional dot grid is off by default; enable it in the graph pane or Settings.

## Non-strict JSON

The parser tries to handle XSSI prefixes, comments, trailing commas, single-quoted strings, JSONP wrappers, and newline-delimited JSON (NDJSON/JSONL). When it cannot recover, it reports the error location and nearby text. Tolerant parsing may change the input's representation; use the original input when exact fidelity matters.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Search | `⌘/Ctrl + F` |
| Open file | `⌘/Ctrl + O` |
| Apply changes in the editor | `⌘/Ctrl + Enter` |
| Expand all / collapse all | `⌘/Ctrl + ⇧ + E` / `⌘/Ctrl + ⇧ + K` |
| Copy selected node as JSON | `⌘/Ctrl + C` (when no text is selected) |
| Navigate the tree | `↑` / `↓`; `→` / `←` to expand or go back |
| Expand or inspect | `Enter` / `Space` |
| Close search or a popover | `Esc` |

## Settings and limits

Settings include English/Chinese, light/dark mode, VS Code and GitHub theme families, code font, font size, indentation, animation, line wrapping, and a node cap. The font dropdown previews each choice. JetBrains Mono (the default), Fira Code, and Inconsolata are bundled; system faces such as Menlo and Monaco need to be installed locally and otherwise fall back. Graph is compact by default and its grid is off.

For documents above the node cap (300,000 by default), the deepest content may not all enter the tree model; search and raw view remain available. Raw view automatically turns off wrapping above 20,000 lines to keep scrolling responsive. Chrome prevents content scripts from running on internal pages and Chrome Web Store pages.
