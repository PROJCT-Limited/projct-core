#!/usr/bin/env node
/**
 * Local dev server: static files + preview API functions.
 * Mirrors the Vercel deployment without requiring Vercel auth.
 *
 * Usage: node dev-server.mjs [port]
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const PORT = parseInt(process.argv[2] || '8080', 10)

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.otf': 'font/otf', '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
}

async function loadHandler(name) {
  const mod = await import(`./api/preview/${name}.js`)
  return mod.default
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // ── API routes ──
  if (url.pathname.startsWith('/api/preview/')) {
    const fn = url.pathname.split('/').pop().replace(/\.js$/, '')
    if (['enable', 'disable', 'query'].includes(fn)) {
      try {
        const handler = await loadHandler(fn)
        req.query = Object.fromEntries(url.searchParams)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }
        res.redirect = (status, location) => {
          res.writeHead(status, { Location: location })
          res.end()
        }
        await handler(req, res)
      } catch (err) {
        console.error(`API error (${fn}):`, err)
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ message: 'Internal error' }))
        }
      }
      return
    }
  }

  // ── Static files ──
  let filePath = path.join(ROOT, decodeURIComponent(url.pathname))
  if (filePath.endsWith('/')) filePath += 'index.html'

  try {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
  } catch {}

  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': mime })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`Dev server: http://localhost:${PORT}`)
  console.log(`Preview API: http://localhost:${PORT}/api/preview/{enable,disable,query}`)
  console.log(`Token loaded: ${process.env.SANITY_API_READ_TOKEN ? 'yes' : 'NO — create .env.local'}`)
})
