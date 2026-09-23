import { render } from 'preact'
import type { ComponentChildren } from 'preact'
import { resetSettings, type Settings } from '@/platform/settings'
import { useResolvedTheme, useSettings } from '@/ui/useSettings'
import { rootVars } from '@/ui/metrics'
import { AutoTheme, BrandMark, Moon, Refresh, Sun } from '@/ui/Icons'
import '@/ui/styles/index.css'

function Field(props: { label: string; desc?: string; control: ComponentChildren }) {
  return (
    <div class="jr-field">
      <div class="jr-field-main">
        <div class="jr-field-label">{props.label}</div>
        {props.desc && <div class="jr-field-desc">{props.desc}</div>}
      </div>
      <div class="jr-field-control">{props.control}</div>
    </div>
  )
}

function Switch(props: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label class="jr-switch" title={props.label}>
      <input
        type="checkbox"
        checked={props.checked}
        aria-label={props.label}
        onChange={(event) => props.onChange((event.currentTarget as HTMLInputElement).checked)}
      />
      <span class="jr-switch-track" />
    </label>
  )
}

function Segmented<T extends string | number>(props: {
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <div class="jr-seg">
      {props.options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          class={option.value === props.value ? 'is-active' : ''}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const themeOptions: {
  value: Settings['theme']
  label: string
  note: string
  icon: ComponentChildren
}[] = [
  { value: 'auto', label: '跟随系统', note: '自动', icon: <AutoTheme size={14} /> },
  { value: 'light', label: '浅色', note: '纸张', icon: <Sun size={14} /> },
  { value: 'dark', label: '深色', note: '墨色', icon: <Moon size={14} /> },
]

function ThemePicker(props: {
  value: Settings['theme']
  language: Settings['language']
  onChange: (next: Settings['theme']) => void
}) {
  return (
    <div class="jr-theme-picker" role="radiogroup" aria-label="主题方案">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          class={option.value === props.value ? 'jr-theme-option is-active' : 'jr-theme-option'}
          type="button"
          role="radio"
          aria-checked={option.value === props.value}
          data-theme-preview={option.value}
          onClick={() => props.onChange(option.value)}
        >
          <span class="jr-theme-preview" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span class="jr-theme-name">
            {option.icon}
            {props.language === 'en'
              ? option.value === 'auto' ? 'System' : option.value === 'light' ? 'Light' : 'Dark'
              : option.label}
          </span>
          <span class="jr-theme-note">
            {props.language === 'en'
              ? option.value === 'auto' ? 'Automatic' : option.value === 'light' ? 'Paper' : 'Ink'
              : option.note}
          </span>
        </button>
      ))}
    </div>
  )
}

const paletteOptions: { value: Settings['palette']; zh: string; en: string }[] = [
  { value: 'vscode', zh: 'VS Code', en: 'VS Code' },
  { value: 'github', zh: 'GitHub 经典', en: 'GitHub Default' },
  { value: 'github-dimmed', zh: 'GitHub 柔和', en: 'GitHub Dimmed' },
  { value: 'github-contrast', zh: 'GitHub 高对比', en: 'GitHub High Contrast' },
]

function PalettePicker(props: {
  value: Settings['palette']
  language: Settings['language']
  onChange: (next: Settings['palette']) => void
}) {
  return (
    <div class="jr-theme-picker" role="radiogroup" aria-label={props.language === 'en' ? 'Colour palette' : '配色方案'}>
      {paletteOptions.map((option) => (
        <button
          key={option.value}
          class={option.value === props.value ? 'jr-theme-option is-active' : 'jr-theme-option'}
          type="button"
          role="radio"
          aria-checked={option.value === props.value}
          data-palette-preview={option.value}
          onClick={() => props.onChange(option.value)}
        >
          <span class="jr-palette-preview" aria-hidden="true">
            <span class="is-light" />
            <span class="is-dark" />
            <i />
          </span>
          <span class="jr-theme-name">{props.language === 'en' ? option.en : option.zh}</span>
          <span class="jr-theme-note">{props.language === 'en' ? 'Light + dark' : '浅色 + 深色'}</span>
        </button>
      ))}
    </div>
  )
}

function Options() {
  const [settings, update] = useSettings()
  const theme = useResolvedTheme(settings.theme)
  const en = settings.language === 'en'

  const patch = (next: Partial<Settings>) => update(next)

  return (
    <div
      class="jr-root"
      lang={en ? 'en' : 'zh-CN'}
      data-theme={theme}
      data-palette={settings.palette}
      data-motion={settings.animations ? 'on' : 'off'}
      style={rootVars(settings.fontSize, settings.fontFamily)}
    >
      <header class="jr-header">
        <div class="jr-brand">
          <BrandMark class="jr-brand-mark" size={22} />
          <span class="jr-brand-name">Jsonora</span>
        </div>
        <span class="jr-spacer" />
        <div class="jr-tools">
          <button
            class="jr-btn"
            type="button"
            title={en ? 'Restore defaults' : '恢复默认设置'}
            onClick={() => void resetSettings()}
          >
            <Refresh />
            {en ? 'Restore defaults' : '恢复默认'}
          </button>
        </div>
      </header>

      <div class="jr-page">
        <div class="jr-page-inner">
          <h1 class="jr-page-title">{en ? 'Settings' : '设置'}</h1>
          <p class="jr-page-sub">
            {en
              ? 'Jsonora parses everything locally and uploads nothing. Settings sync through your Chrome account.'
              : 'Jsonora 的所有解析都在本地完成，不会上传任何数据。设置会通过你的 Chrome 账号同步。'}
          </p>

          <section class="jr-section">
            <div class="jr-section-head">{en ? 'Appearance' : '外观'}</div>
            <div class="jr-section-body">
              <Field
                label="界面语言 / Language"
                desc={en ? 'Switch interface text in the viewer and settings panel.' : '切换查看器与内置设置面板的界面文字。'}
                control={
                  <Segmented
                    value={settings.language}
                    onChange={(language) => patch({ language })}
                    options={[
                      { value: 'zh' as const, label: '中文' },
                      { value: 'en' as const, label: 'English' },
                    ]}
                  />
                }
              />
              <Field
                label={en ? 'Theme' : '主题'}
                desc={en ? 'Choose brightness independently. System follows your OS.' : '只控制明暗外观；「跟随系统」会随操作系统自动切换。'}
                control={
                  <ThemePicker
                    value={settings.theme}
                    language={settings.language}
                    onChange={(value) => patch({ theme: value })}
                  />
                }
              />
              <Field
                label={en ? 'Colour palette' : '配色方案'}
                desc={en ? 'Every palette includes a complete light and dark appearance.' : '每套配色都完整包含浅色与深色两种外观。'}
                control={
                  <PalettePicker
                    value={settings.palette}
                    language={settings.language}
                    onChange={(value) => patch({ palette: value })}
                  />
                }
              />
              <Field
                label={en ? 'Field font' : '字段字体'}
                desc={en ? 'Choose the typeface used by JSON keys and values.' : '选择 JSON 键名、值与图形节点使用的字体。'}
                control={
                  <Segmented
                    value={settings.fontFamily}
                    onChange={(fontFamily) => patch({ fontFamily })}
                    options={[
                      { value: 'modern' as const, label: en ? 'Modern' : '现代等宽' },
                      { value: 'system' as const, label: en ? 'System' : '系统等宽' },
                      { value: 'sans' as const, label: en ? 'Sans' : '无衬线' },
                    ]}
                  />
                }
              />
              <Field
                label={en ? 'Font size' : '字号'}
                desc={en ? 'Controls the code size in Tree, Graph and Raw views.' : '影响树形、图形与原始视图的等宽字体大小。'}
                control={
                  <input
                    class="jr-range"
                    type="range"
                    min={11}
                    max={18}
                    step={1}
                    value={settings.fontSize}
                    onInput={(event) =>
                      patch({ fontSize: Number((event.currentTarget as HTMLInputElement).value) })
                    }
                  />
                }
              />
              <Field
                label={en ? 'Motion' : '动画'}
                desc={en ? 'Subtle transitions while loading, expanding and collapsing.' : '展开、折叠与加载时的过渡效果。关闭后界面会立刻响应。'}
                control={
                  <Switch
                    label={en ? 'Motion' : '动画'}
                    checked={settings.animations}
                    onChange={(next) => patch({ animations: next })}
                  />
                }
              />
            </div>
          </section>

          <section class="jr-section">
            <div class="jr-section-head">{en ? 'Page rendering' : '页面渲染'}</div>
            <div class="jr-section-body">
              <Field
                label={en ? 'Render JSON responses automatically' : '自动渲染 JSON 响应'}
                desc={en ? 'Take over application/json pages with Jsonora; Raw remains the default view.' : '当页面本身就是一个 JSON 响应（Content-Type 为 application/json）时，自动用 Jsonora 接管渲染，并默认显示「原始」视图。'}
                control={
                  <Switch
                    label={en ? 'Render JSON responses automatically' : '自动渲染 JSON 响应'}
                    checked={settings.autoRender}
                    onChange={(next) => patch({ autoRender: next })}
                  />
                }
              />
              <Field
                label={en ? 'Detect JSON code blocks' : '识别页面内的 JSON 代码块'}
                desc={en ? 'Offer an inline renderer for JSON-looking <pre> blocks in docs and debug pages.' : '在文档、博客、调试页面里检测看起来像 JSON 的 <pre> 区块，并在右下角提供一个渲染按钮。'}
                control={
                  <Switch
                    label={en ? 'Detect JSON code blocks' : '识别页面内的 JSON 代码块'}
                    checked={settings.inlineBlocks}
                    onChange={(next) => patch({ inlineBlocks: next })}
                  />
                }
              />
            </div>
          </section>

          <section class="jr-section">
            <div class="jr-section-head">{en ? 'Viewer' : '查看器'}</div>
            <div class="jr-section-body">
              <Field
                label={en ? 'Default indent' : '默认缩进'}
                desc={en ? 'Used when formatting, copying and exporting JSON.' : '用于「美化」以及详情面板中复制/导出的 JSON。'}
                control={
                  <Segmented
                    value={settings.indent}
                    onChange={(value) => patch({ indent: value })}
                    options={[
                      { value: 2 as const, label: en ? '2 spaces' : '2 空格' },
                      { value: 4 as const, label: en ? '4 spaces' : '4 空格' },
                      { value: 'tab' as const, label: 'Tab' },
                    ]}
                  />
                }
              />
              <Field
                label={en ? 'Initial expansion depth' : '初始展开层级'}
                desc={en ? 'Nested levels opened in Tree and Graph. Zero collapses everything.' : '打开文档时自动展开的嵌套层数，0 表示全部折叠。'}
                control={
                  <input
                    class="jr-num"
                    type="number"
                    min={0}
                    max={8}
                    value={settings.expandDepth}
                    onChange={(event) =>
                      patch({
                        expandDepth: Math.max(
                          0,
                          Math.min(8, Number((event.currentTarget as HTMLInputElement).value) || 0),
                        ),
                      })
                    }
                  />
                }
              />
              <Field
                label={en ? 'Sort keys by default' : '默认按字母排序键名'}
                desc={en ? 'Sort object keys alphabetically without changing array order.' : '对象键按字典序排列，数组顺序不变。也可以在查看器里临时切换。'}
                control={
                  <Switch
                    label={en ? 'Sort keys by default' : '默认按字母排序键名'}
                    checked={settings.sortKeys}
                    onChange={(next) => patch({ sortKeys: next })}
                  />
                }
              />
              <Field
                label={en ? 'Show line numbers' : '显示行号'}
                desc={en ? 'Applies to the Raw view.' : '仅在「原始」视图中生效。'}
                control={
                  <Switch
                    label={en ? 'Show line numbers' : '显示行号'}
                    checked={settings.showLineNumbers}
                    onChange={(next) => patch({ showLineNumbers: next })}
                  />
                }
              />
              <Field
                label={en ? 'Wrap lines by default' : '默认自动换行'}
                desc={en ? 'Wrap long lines in Raw. Disabled automatically above 20,000 lines.' : '原始视图中长行折行显示。行数超过 2 万时会自动关闭以保证流畅。'}
                control={
                  <Switch
                    label={en ? 'Wrap lines by default' : '默认自动换行'}
                    checked={settings.wrapLines}
                    onChange={(next) => patch({ wrapLines: next })}
                  />
                }
              />
              <Field
                label={en ? 'Graph grid' : '图形网格'}
                desc={en ? 'Show subtle dots and sparse guide lines on the graph canvas. Off by default.' : '在图形画布上显示轻点阵与稀疏主线，默认关闭。'}
                control={
                  <Switch
                    label={en ? 'Graph grid' : '图形网格'}
                    checked={settings.showGrid}
                    onChange={(next) => patch({ showGrid: next })}
                  />
                }
              />
              <Field
                label={en ? 'Compact graph cards' : '紧凑图形卡片'}
                desc={en ? 'Group direct fields inside one object card, JSON-Crack style.' : '把对象的直接字段收进一张卡片，嵌套对象继续通过连线展开。'}
                control={
                  <Switch
                    label={en ? 'Compact graph cards' : '紧凑图形卡片'}
                    checked={settings.compactGraph}
                    onChange={(next) => patch({ compactGraph: next })}
                  />
                }
              />
              <Field
                label={en ? 'Maximum nodes' : '最大节点数'}
                desc={en ? 'Caps the model for large documents. Search and Raw remain unaffected.' : '超过上限的深层内容不会被构建成树，避免超大文档卡住页面。搜索与原始视图不受限制。'}
                control={
                  <select
                    class="jr-select"
                    value={String(settings.maxNodes)}
                    onChange={(event) =>
                      patch({ maxNodes: Number((event.currentTarget as HTMLSelectElement).value) })
                    }
                  >
                    <option value="50000">{en ? '50k' : '5 万'}</option>
                    <option value="150000">{en ? '150k' : '15 万'}</option>
                    <option value="300000">{en ? '300k (default)' : '30 万（默认）'}</option>
                    <option value="600000">{en ? '600k' : '60 万'}</option>
                    <option value="2000000">{en ? '2M (may be slow)' : '200 万（可能卡顿）'}</option>
                  </select>
                }
              />
            </div>
          </section>

          <section class="jr-section">
            <div class="jr-section-head">{en ? 'Keyboard shortcuts' : '快捷键'}</div>
            <div class="jr-section-body">
              <Field label={en ? 'Search' : '搜索'} control={<span class="jr-kbd">⌘ / Ctrl + F</span>} />
              <Field label={en ? 'Expand all' : '全部展开'} control={<span class="jr-kbd">⌘ / Ctrl + ⇧ + E</span>} />
              <Field label={en ? 'Collapse all' : '全部折叠'} control={<span class="jr-kbd">⌘ / Ctrl + ⇧ + K</span>} />
              <Field label={en ? 'Open file' : '打开文件'} control={<span class="jr-kbd">⌘ / Ctrl + O</span>} />
              <Field
                label={en ? 'Copy selected item' : '复制选中项'}
                desc={en ? 'Copies the selected node rather than the whole document.' : '选中某一行后按复制，会复制该节点的 JSON（不是整篇文档）。'}
                control={<span class="jr-kbd">⌘ / Ctrl + C</span>}
              />
              <Field
                label={en ? 'Arrow-key navigation' : '方向键导航'}
                desc={en ? '↑ ↓ move, → opens or enters, ← collapses or returns, Enter opens details.' : '↑ ↓ 移动，→ 展开或进入子级，← 折叠或回到父级，Enter 展开或查看详情。'}
                control={<span class="jr-kbd">↑ ↓ ← → ↵</span>}
              />
            </div>
          </section>

          <section class="jr-section">
            <div class="jr-section-head">{en ? 'About' : '关于'}</div>
            <div class="jr-section-body">
              <Field
                label="Jsonora"
                desc={en ? 'A fast, considered JSON viewer. Local parsing, no network requests, no telemetry.' : '一个更快、更好看的 JSON 查看器。纯本地解析，无网络请求，无遥测。'}
                control={<span class="jr-field-desc">v0.1.0</span>}
              />
              <Field
                label={en ? 'Restore defaults' : '恢复默认设置'}
                desc={en ? 'Reset theme, indentation, limits and every other preference.' : '把所有选项还原成初始状态，包括主题、缩进与渲染限制。'}
                control={
                  <button class="jr-btn is-ghost" type="button" onClick={() => void resetSettings()}>
                    {en ? 'Restore defaults' : '恢复默认'}
                  </button>
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

render(<Options />, document.getElementById('app') as HTMLElement)
