# Jsonora design brief (internal reference)

[简体中文](DESIGN-BRIEF.md) · English

> Jsonora is a Chrome JSON viewer extension. For current product behavior and branding, consult the [README](../README.en.md), [brand guide](BRAND.en.md), and source code. This brief preserves questions and decisions from design iteration.

---

## 1. What this is

Chrome's built-in JSON display is essentially raw lines of text. Other extensions can feel unpolished, stall on documents tens of megabytes large, or reject common non-strict inputs such as comments, trailing commas, and JSONP. Jsonora addresses these three problems with a carefully designed interface, a virtualized tree, and tolerant parsing.

Typical uses, roughly in order of frequency:

1. Open an API URL; see highlighted raw JSON on the left and switch between Tree and Graph on the right.
2. Paste JSON copied elsewhere, format and search it, and copy a selected subtree.
3. Expand a JSON code block in a document or blog without leaving the page.
4. Debug an API response in DevTools.

---

## 2. Runtime constraints

| Constraint | Design implication |
| --- | --- |
| **Chrome MV3 extension** | The product runs in Chrome; it is not a standalone website. |
| **Injection into arbitrary sites** | The viewer uses a Shadow DOM overlay. Host CSS must not affect it, and its styles cannot depend on the host environment. |
| **Popup size** | Chrome popups top out at roughly 800×600; the design uses a 348px width. |
| **Fonts** | Do not assume users have a particular font. Use system UI and monospace stacks. No font files are currently bundled; a font weight could add about 40 KB. |
| **Color modes** | Design both light and dark, with a system-following option. |
| **Untrusted content** | Strings may be extremely long, unbroken, emoji, right-to-left, or Chinese. |

---

## 3. Interface inventory

There are ten surfaces. The first four account for most use.

### 3.1 Main viewer

The standalone tab and the overlay on a page share the same UI and CSS.

```text
┌─────────────────────────────────────────────────────────────┐
│ ◈ Jsonora       File  View             Search  中/EN  Settings │
├─────────────────────────────────────────────────────────────┤
│ JSON             [hide] │⋮│           Compact Grid [hide]  │
├─────────────────────────────────────────────────────────────┤
│  1  {                    │ │       $ ── user ── name          │
│  2    "user": {          │ │              └── tags           │
│  3      "name": "Ada"   │ │                                  │
├─────────────────────────────────────────────────────────────┤
│ 1.8 KB · 14 nodes · depth 1 · object · 18 ms    $.user.name │
└─────────────────────────────────────────────────────────────┘
```

- **Top bar:** brand, File/View menus, search, language, and Settings. Expansion, folding, formatting, and ordering controls live in Settings.
- **Content:** raw JSON on the left; View selects either Graph or Tree on the right. The divider is draggable and each pane can be collapsed independently.
- **Bottom bar:** statistics on the left and the selected node's JSONPath and copy action on the right.

Current screenshot: `docs/preview-current.png` (grid off). Earlier split-layout screenshots remain under `docs/preview-split*.png`.

### 3.2 Tree view

One JSON node per 24px row. Virtual scrolling renders only visible rows, including for very large trees. Each row contains an indent guide, expansion control, key, colon, and value.

- Keys blue, strings green, numbers orange, booleans purple, `null` italic gray, brackets cyan.
- Containers show `{…}` or `[…]` and their immediate child count.
- Hover colors the full row; selection adds a 2px accent at the left.
- Search matches use a yellow `<mark>` highlight.

**Design question:** Could objects, arrays, and values be distinguished more clearly without relying only on color or increasing density?

### 3.3 Graph view

The graph offers two instantly switchable representations connected by Bézier curves, with pan and zoom.

- **Individual nodes:** each JSON node is a 30px-high rounded box, useful for tracing individual fields.
- **Compact cards:** a container becomes a card with its direct fields as 29px rows. Expanding a nested object connects its row to another card.
- Expansion uses arrows and `{…}` / `[…]`, avoiding ambiguous dashed borders.
- Connections are thin gray curves; connections of the selected node take the accent color.
- The grid is off by default. When enabled in the graph header or Settings, it uses a faint 24px dot pattern and sparse 144px major lines.
- A floating control at lower right provides zoom −/+, percentage, and fit-to-window.
- Relayout animates positions and connections over 320ms.

Screenshots: `docs/preview-graph.png`, `docs/preview-compact.png`.

### 3.4 Raw view

Virtualized text with syntax highlighting and line numbers. The 58px right-aligned line-number gutter stays put during horizontal scrolling. Wrapping is optional; an unrecoverable parse error colors its line red.

### 3.5 Empty state

Shown on first open or after clearing: a 42px J mark on warm paper with a terracotta node, the headline “Make complex JSON clear,” a fine-bordered drop zone with Paste JSON and Choose File, three example-data buttons, and a keyboard-shortcut hint.

### 3.6 Error state

A particularly important surface: the point at which users need help most. It includes an error icon and heading, a yellow hint that translates the V8 error into plain language where possible, line/column/offset, the affected line with two lines of context on either side and a `^` pointer, plus actions to view the raw data, copy the error, or choose another file. See `docs/preview-error.png`.

### 3.7 Detail panel

Clicking a node's `⋯` opens an inspector at right with its full value (formatted JSON for a container), JSONPath, type, byte count, child count, and actions to copy the path/value or download. See `docs/preview-detail.png`.

### 3.8 Extension popup

A 348px-wide popup with three cards: current-page detection and a render action; quick-paste text input and a format/open action; and a keyboard-shortcut hint.

### 3.9 Settings

The in-viewer settings panel is 410px wide and works even in the regular-page demo. An independent extension options page also exists. Groups cover language, appearance, and viewer. Controls include theme preview cards, segmented indentation control, toggles, numeric input, dropdowns, and a font-size slider.

### 3.10 Inline viewer and page prompt

On a regular page with eligible JSON blocks, a dismissible lower-right prompt offers to render N JSON snippets. Clicking replaces each eligible `<pre>` with a 520px-high inline viewer.

---

## 4. Design system

Tokens live in `src/ui/styles/tokens.css`; editing them changes the whole UI.

### 4.1 Theme families

The reference to qevi-studio concerns the overall design language of its **documentation pages**, not the Studio/BFF color scheme. Mode (light, dark, system) and palette are independent: every palette includes complete light and dark variants.

| Palette | Light background / accent | Dark background / accent | Character |
| --- | --- | --- | --- |
| VS Code (default) | `#ffffff` / `#005fb8` | `#1f1f1f` / `#75bfff` | Modern workspace hierarchy and JSON syntax colors |
| GitHub Classic | `#ffffff` / `#0969da` | `#0d1117` / `#58a6ff` | Familiar GitHub light and dark |
| GitHub Dimmed | `#f6f8fa` / `#0969da` | `#22272e` / `#539bf5` | Softer hierarchy |
| GitHub Contrast | `#ffffff` / `#0349b4` | `#0a0c10` / `#71b7ff` | Higher contrast |

Reference screenshots include `docs/preview-raw.png`, `docs/preview-settings.png`, `docs/preview-menu.png`, and `docs/preview-graph.png`.

### 4.2 Default VS Code dark syntax colors

| Meaning | Token | Value |
| --- | --- | --- |
| Key | `--t-key` | `#9cdcfe` |
| String | `--t-string` | `#ce9178` |
| Number | `--t-number` | `#b5cea8` |
| Boolean | `--t-bool` | `#569cd6` |
| Null | `--t-null` | `#c586c0` |
| Matching brackets | `--t-brace-0/1/2` | `#ffd700` / `#da70d6` / `#179fff` |
| Punctuation | `--t-punct` | `#cccccc` |
| Indent guide | `--raw-guide` | `#404040` |

### 4.3 Color principles

Large areas stay neutral; accents are reserved for selection, focus, the fine header line, and JSON type colors. The top bar uses a single-color fine rule, not a spectral gradient or glow. The JSON panel stays clean; only the graph canvas has an optional grid, off by default. Menus, inspectors, and HUDs use solid surface levels and subtle shadows.

### 4.4 Shape and motion

| Token | Value |
| --- | --- |
| Radius | 3 / 5 / 7 / 9px (xs / sm / default / lg) |
| Shadows | `0 1px 2px rgba(0,0,0,.28)` / `0 14px 36px rgba(0,0,0,.38)` / `0 28px 72px rgba(0,0,0,.50)` |
| Standard easing | `cubic-bezier(.22, 1, .36, 1)` |
| Spring easing | `cubic-bezier(.34, 1.4, .64, 1)` |
| Durations | 120ms / 180ms / 220ms |
| Tree row height | 24px |
| Indent step | 16px |
| Raw line height | 20px |
| Font size | 13px (adjustable from 11–18 in Settings) |

### 4.5 Typography

```text
UI: Inter, "Avenir Next", "SF Pro Text", -apple-system, BlinkMacSystemFont,
    "Segoe UI Variable Text", "Segoe UI", "PingFang SC", "Microsoft YaHei UI", system-ui, sans-serif

Headings: Georgia, "Iowan Old Style", "Noto Serif CJK SC", "Source Han Serif SC",
          "Songti SC", SimSun, serif

Code (default): "Jsonora JetBrains Mono", Menlo, Consolas,
                "PingFang SC", "Microsoft YaHei", monospace
```

The document-style serif stack is for headings; controls and body copy use a clear sans-serif stack. JSON content can use bundled JetBrains Mono, Fira Code, and Inconsolata, or locally installed Menlo, Monaco, and Courier New. Chinese content falls back to PingFang SC or Microsoft YaHei.

### 4.6 Motion inventory

Settings can disable these implemented effects: staggered fade-in of newly expanded rows (13ms per row, capped at 24); 180ms spring rotation of expansion controls; sliding view indicators; 320ms graph relayout with synchronized edge interpolation; theme color transitions; toast entrance from below; inspector entrance from the right; top-bar entrance from above. Honor the system's reduced-motion setting.

---

## 5. Interaction inventory

| Action | Interaction |
| --- | --- |
| Search | `⌘F` or search icon; regex, case sensitivity, matches-only |
| Navigate matches | `↵`, `⇧↵`, or navigation buttons; expand ancestors and scroll into place |
| Expand / collapse all | `⌘⇧E` / `⌘⇧K` |
| Open file | `⌘O`, drag-and-drop, or drop-zone button |
| Paste | `⌘V` in the page |
| Copy selected node | `⌘C` when no text is selected |
| Arrow-key navigation | `↑↓` move; `→` expand or enter a child; `←` collapse or return to parent |
| Expand / inspect | `↵` / `Space` |
| Dismiss search or overlay | `Esc` |
| Graph | Wheel zoom around pointer; drag to pan; click to expand/collapse; double-click to inspect |
| Split layout | Drag divider; collapse and restore either pane independently |
| Graph grid | Toggle in graph header; off by default; setting persists |
| Graph style | Switch between individual nodes and compact cards in graph header; setting persists |

---

## 6. Design questions by priority

### P0 — Graph representation (both modes provided)

**A:** one rounded box per node, joined by curves, for tracing the overall structure. **B (default):** direct fields live inside a compact multi-row card; only expanded containers create another card. Both share expansion, search, selection, zoom, and pan. Large documents still auto-collapse branches when they exceed the rendering budget.

### P1 — Code font

Six persistent choices exist: bundled JetBrains Mono (default), Fira Code, and Inconsolata, plus locally installed Menlo, Monaco, and Courier New. Only the Latin WOFF2 subsets are bundled; Chinese falls back to PingFang SC / Microsoft YaHei. Other typography choices to review are font size, weight, and line height (currently 13px / 400 by default, 24px in Tree and 22px in Raw).

### P2 — Information density

A tree row can show indent guides, expansion control, key, colon, value, comma, optional badges for long strings or unsafe integer precision, and a hover-only `⋯` action. Decide what belongs on the row versus in the detail panel, and how badges should look.

### P3 — Empty state and first use

The simple empty state is a user's first impression and merits focused design attention.

### P4 — Icon system

Icons are hand-drawn 24×24 outlined shapes in `src/ui/Icons.tsx`, with a 2px rounded stroke. Consider whether to adopt a consistent icon library such as Lucide or Phosphor, or retain the bespoke set.

### P5 — Brand

The mark is a warm-paper rounded tile, a dark J, and a terracotta square. See the [brand guide](BRAND.en.md) for vector artwork, PNG uses, and colors.

---

## 7. Suggested design deliverables

If a design pass is needed, work in this order: Graph view (P0), typography (P1), tree density and badges (P2), empty state and first-use experience (P3), then icon system and brand (P4/P5). Figma is preferred. Use the token names from section 4 as Figma variable names to align design and code.

---

## 8. Code locations

```text
src/
├── ui/styles/tokens.css     ← design tokens
├── ui/styles/app.css        ← component styles
├── ui/Icons.tsx             ← icons
├── ui/App.tsx               ← main layout and state
├── ui/TreeView.tsx          ← tree
├── ui/GraphView.tsx         ← graph
├── ui/RawView.tsx           ← raw JSON
├── ui/Toolbar.tsx           ← top bar
├── ui/SearchBar.tsx         ← search
├── ui/EmptyState.tsx        ← empty state
├── ui/ErrorView.tsx         ← error state
├── ui/DetailModal.tsx       ← detail inspector
├── pages/popup/             ← extension popup
├── pages/options/           ← settings page
└── pages/devtools/          ← DevTools panel
```

Screenshots are under `docs/`. Run `npm run dev` to preview the viewer in a regular browser with hot style updates, without the extension environment.
