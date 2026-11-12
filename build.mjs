// 静态博客生成器：posts/*.md -> dist/
// 零框架依赖，只用到 marked 一个包。

import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

const ROOT = process.cwd()
const POSTS_DIR = path.join(ROOT, 'posts')
const DIST = path.join(ROOT, 'dist')

const SITE = {
  title: 'AgentUp',
  tagline: '架构与 AI 落地笔记',
  description: '关于企业架构、AI Agent 与工程落地的思考。',
  url: 'https://' + (process.env.SITE_HOST || 'example.github.io'),
  lang: 'zh-CN',
}

marked.setOptions({ gfm: true, breaks: false })

/* ---------- 工具函数 ---------- */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: {}, body: raw }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    const [, key, rawVal] = kv
    let val = rawVal.trim()
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else {
      val = val.replace(/^["']|["']$/g, '')
    }
    data[key] = val
  }
  return { data, body: raw.slice(m[0].length) }
}

function readingTime(md) {
  const cjk = (md.match(/[\u4e00-\u9fff]/g) || []).length
  const words = (md.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return Math.max(1, Math.round(cjk / 400 + words / 220))
}

function firstImage(md) {
  const m = md.match(/!\[[^\]]*\]\(([^)\s]+)/)
  return m ? m[1] : null
}

/* ---------- 模板 ---------- */

function page({ title, description, content, headExtra = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="/assets/style.css">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.title)}" href="/feed.xml">
${headExtra}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<header class="site-head">
  <a class="brand" href="/">${esc(SITE.title)}</a>
  <span class="tagline">${esc(SITE.tagline)}</span>
</header>
<main>
${content}
</main>
<footer class="site-foot">
  <span>© ${new Date().getFullYear()} ${esc(SITE.title)}</span>
  <a href="/feed.xml">RSS</a>
</footer>
</body>
</html>
`
}

const tagList = (tags) =>
  Array.isArray(tags) && tags.length
    ? `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : ''

/* ---------- 主流程 ---------- */

async function loadPosts() {
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md'))
  const posts = []
  for (const file of files) {
    const raw = await readFile(path.join(POSTS_DIR, file), 'utf8')
    const { data, body } = parseFrontmatter(raw)
    const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')

    // 正文首个 H1 与 frontmatter title 重复，去掉
    let md = body.replace(/^\s*#\s+.*(?:\r?\n)+/, '')

    const html = marked.parse(md)
    posts.push({
      slug,
      file,
      title: data.title || slug,
      date: data.date || '',
      tags: data.tags || [],
      summary: data.summary || '',
      cover: firstImage(md),
      minutes: readingTime(md),
      html,
    })
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

async function build() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true })
  await mkdir(DIST, { recursive: true })

  const posts = await loadPosts()

  // 首页
  const items = posts
    .map(
      (p) => `  <article class="card">
    <a class="card-link" href="/posts/${p.slug}/">
      <h2>${esc(p.title)}</h2>
    </a>
    <p class="meta"><time datetime="${esc(p.date)}">${esc(p.date)}</time> · ${p.minutes} 分钟</p>
    <p class="summary">${esc(p.summary)}</p>
    ${tagList(p.tags)}
  </article>`
    )
    .join('\n')

  const index = page({
    title: `${SITE.title} · ${SITE.tagline}`,
    description: SITE.description,
    content: `<section class="hero">
  <h1>${esc(SITE.tagline)}</h1>
  <p>${esc(SITE.description)}</p>
</section>
<section class="list">
${items}
</section>`,
    bodyClass: 'home',
  })
  await writeFile(path.join(DIST, 'index.html'), index)

  // 文章页
  for (const p of posts) {
    const outDir = path.join(DIST, 'posts', p.slug)
    await mkdir(outDir, { recursive: true })
    const html = page({
      title: `${p.title} · ${SITE.title}`,
      description: p.summary || SITE.description,
      content: `<article class="post">
  <header class="post-head">
    <h1>${esc(p.title)}</h1>
    <p class="meta"><time datetime="${esc(p.date)}">${esc(p.date)}</time> · ${p.minutes} 分钟阅读</p>
    ${tagList(p.tags)}
  </header>
  <div class="prose">
${p.html}
  </div>
  <nav class="post-foot"><a href="/">← 返回首页</a></nav>
</article>`,
      headExtra: `<meta property="article:published_time" content="${esc(p.date)}">`,
    })
    await writeFile(path.join(outDir, 'index.html'), html)
  }

  // 静态资源
  await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true })

  // RSS
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(SITE.title)}</title>
<link>${SITE.url}/</link>
<description>${esc(SITE.description)}</description>
${posts
  .map(
    (p) => `<item>
  <title>${esc(p.title)}</title>
  <link>${SITE.url}/posts/${p.slug}/</link>
  <guid>${SITE.url}/posts/${p.slug}/</guid>
  <pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate>
  <description>${esc(p.summary)}</description>
</item>`
  )
  .join('\n')}
</channel></rss>`
  await writeFile(path.join(DIST, 'feed.xml'), rss)

  // 404
  await writeFile(
    path.join(DIST, '404.html'),
    page({ title: '404', description: SITE.description, content: `<section class="hero"><h1>找不到这个页面</h1><p><a href="/">回到首页</a></p></section>` })
  )

  console.log(`✓ 构建完成：${posts.length} 篇文章 -> dist/`)
  for (const p of posts) console.log(`  · ${p.date}  ${p.title}  (/posts/${p.slug}/)`)
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
