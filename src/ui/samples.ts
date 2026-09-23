export interface Sample {
  id: string
  label: string
  description: string
  text: string
}

const api = {
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
        bio: '第一位程序员。\n喜欢解析机与分析机。',
        avatar: 'https://cdn.example.com/a/01H8X.png',
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
        avatar: 'https://cdn.example.com/a/01H8Y.png',
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
        avatar: 'https://cdn.example.com/a/01H8Z.png',
        location: { city: 'Wilmslow', country: 'UK', lat: 53.3285, lon: -2.2305 },
      },
      lastLoginAt: '2026-08-02T11:15:44.000Z',
      deletedAt: '2026-08-30T00:00:00.000Z',
    },
  ],
  links: { self: '/v1/users?page=1', next: '/v1/users?page=2', prev: null },
}

function bigPayload(): string {
  const rows = []
  for (let i = 0; i < 4000; i++) {
    rows.push({
      index: i,
      id: `row_${(i * 2654435761 % 4294967296).toString(16)}`,
      name: `记录 ${i}`,
      status: ['active', 'pending', 'archived'][i % 3],
      amount: Number((Math.sin(i) * 1000).toFixed(2)),
      tags: [`t${i % 7}`, `group-${i % 13}`],
      nested: { level: i % 5, ok: i % 2 === 0, note: null },
    })
  }
  return JSON.stringify(
    { total: rows.length, generatedAt: '2026-09-22T00:00:00.000Z', rows },
    null,
    2,
  )
}

export const SAMPLES: Sample[] = [
  {
    id: 'api',
    label: 'API 响应',
    description: '典型的接口返回，含嵌套对象与数组',
    text: JSON.stringify(api, null, 2),
  },
  {
    id: 'config',
    label: '配置文件',
    description: '含注释与尾随逗号，用容错解析',
    text: `{\n  "name": "jsonora",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {\n    "dev": "vite",\n    "build": "node tools/build.mjs",\n    "test": "vitest run",\n  },\n  "dependencies": { "preact": "^10.29.8" },\n  // 浏览器最低版本\n  "targets": { "chrome": "110" },\n}\n`,
  },
  {
    id: 'big',
    label: '大文档',
    description: '4000 条记录，验证虚拟滚动',
    text: bigPayload(),
  },
]

export const sampleById = (id: string): Sample | undefined => SAMPLES.find((s) => s.id === id)
