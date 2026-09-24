#!/usr/bin/env node
/**
 * Fixture + harness server used to verify the *built* content script outside of Chrome's
 * extension loader (Chrome 137+ ignores `--load-extension` from the command line).
 *
 * `/harness/auto` serves the payload the way Chrome's own JSON viewer does — a single
 * `<pre>` — and spoofs `document.contentType` so the content-type branch is exercised too.
 * `/harness/inline` is an ordinary documentation page with JSON code blocks.
 *
 * Not part of the extension bundle.
 */
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(here, '../dist')

const users = {
  meta: { requestId: 'req_8f3c1a90b2', took: 37, page: 1, perPage: 3 },
  data: [
    {
      id: 'usr_01H8X',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      active: true,
      score: 98.5,
      roles: ['admin', 'engineer'],
      profile: {
        bio: '第一位程序员。',
        location: { city: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
      },
      lastLoginAt: '2026-09-21T18:04:11.000Z',
      deletedAt: null,
    },
    {
      id: 'usr_01H8Y',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      active: true,
      score: 96.2,
      roles: ['engineer'],
      profile: {
        bio: '编译器之母。',
        location: { city: 'New York', country: 'US', lat: 40.7128, lon: -74.006 },
      },
      lastLoginAt: '2026-09-20T09:31:02.000Z',
      deletedAt: null,
    },
    {
      id: 'usr_01H8Z',
      name: 'Alan Turing',
      email: 'alan@example.com',
      active: false,
      score: 99.9,
      roles: ['admin', 'researcher'],
      profile: {
        bio: '可计算数。',
        location: { city: 'Wilmslow', country: 'UK', lat: 53.3285, lon: -2.2305 },
      },
      lastLoginAt: '2026-08-02T11:15:44.000Z',
      deletedAt: '2026-08-30T00:00:00.000Z',
    },
  ],
  links: { self: '/api/users?page=1', next: '/api/users?page=2', prev: null },
}

const broken = '{\n  "name": "jsonora",\n  "version": "0.1.0",\n  "tags": ["a", "b",]\n  "enabled": true\n}\n'

const escaped = JSON.stringify(JSON.stringify(users, null, 2))

const docsPage = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>接口文档 — Jsonora 测试页</title>
<style>
  body{font:14px/1.7 -apple-system,system-ui,"PingFang SC",sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#1a1d24;background:#fff}
  h1{font-size:22px;margin-bottom:6px}
  p{color:#5a6379}
  code{background:#f0f2f6;padding:2px 5px;border-radius:4px;font-size:12.5px}
  pre{background:#f6f7f9;border:1px solid #e4e7ed;border-radius:8px;padding:14px;overflow:auto;font-size:12.5px}
</style></head>
<body>
<h1>接口文档</h1>
<p>下面是 <code>GET /api/users</code> 的示例响应：</p>
<pre>${JSON.stringify(users, null, 2)}</pre>
<p>下面这段是普通 JavaScript，不应被识别为 JSON：</p>
<pre>function greet(name) {
  return "hello " + name;
}</pre>
<p>再来一个小的 JSON 片段：</p>
<pre>{"ok": true, "count": 3, "items": [1, 2, 3]}</pre>
</body></html>`

/** Mimics Chrome's own rendering of a JSON response: raw text inside a single <pre>. */
const autoPage = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>Jsonora harness</title>
<style>body{margin:0}pre{margin:0;padding:8px;font:12px/1.5 monospace}</style>
<script>
  // The content script branches on document.contentType; spoof it so the harness exercises
  // the same path a real application/json response takes.
  Object.defineProperty(document, 'contentType', {
    configurable: true,
    get: () => 'application/json',
  })
</script>
</head>
<body><pre>${JSON.stringify(users, null, 2)}</pre><div class="json-formatter-container"></div>
<script src="/content.js"></script>
</body></html>`

const compactPage = autoPage.replace(
  JSON.stringify(users, null, 2),
  JSON.stringify(users),
)

const inlinePage = docsPage.replace(
  '</body>',
  '<script src="/content.js"></script>\n</body>',
)

const routes = {
  '/api/users': () => ['application/json; charset=utf-8', JSON.stringify(users, null, 2)],
  '/api/compact': () => ['application/json', JSON.stringify(users)],
  '/api/broken': () => ['application/json', broken],
  '/api/array': () => [
    'application/json',
    JSON.stringify(
      Array.from({ length: 300 }, (_, i) => ({
        i,
        id: `row_${i}`,
        ok: i % 2 === 0,
        tags: ['a', 'b'],
      })),
      null,
      2,
    ),
  ],
  '/plain': () => ['text/plain; charset=utf-8', JSON.stringify(users, null, 2)],
  '/page': () => ['text/html; charset=utf-8', docsPage],
  '/harness/auto': () => ['text/html; charset=utf-8', autoPage],
  '/harness/compact': () => ['text/html; charset=utf-8', compactPage],
  '/harness/inline': () => ['text/html; charset=utf-8', inlinePage],
  '/harness/escaped': () => ['text/html; charset=utf-8', `<pre id="p">${escaped}</pre>`],
  '/text': () => ['text/plain; charset=utf-8', 'just some text, not json at all'],
}

const port = Number(process.env.PORT ?? 5199)

http
  .createServer(async (req, res) => {
    const pathname = (req.url ?? '/').split('?')[0]

    if (pathname === '/content.js') {
      try {
        const body = await fs.readFile(path.join(dist, 'content.js'))
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' })
        res.end(body)
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('build dist/content.js first')
      }
      return
    }

    const route = routes[pathname]
    if (!route) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')
      return
    }
    const [type, body] = route()
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
    res.end(body)
  })
  .listen(port, () => {
    console.log(`[fixtures] http://localhost:${port}/`)
    for (const p of Object.keys(routes)) console.log(`  ${p}`)
  })
