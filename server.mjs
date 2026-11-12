// 本地预览：node build.mjs && node server.mjs
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

const DIST = path.resolve('dist')
const PORT = Number(process.env.PORT || 4321)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

if (!existsSync(DIST)) {
  console.error('dist/ 不存在，请先运行 node build.mjs')
  process.exit(1)
}

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = path.join(DIST, urlPath)

  try {
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    const body = await readFile(path.join(DIST, '404.html')).catch(() => 'Not found')
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(body)
  }
}).listen(PORT, () => console.log(`▸ http://localhost:${PORT}`))
