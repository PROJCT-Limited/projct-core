import crypto from 'crypto'
import { createClient } from '@sanity/client'

const PROJECT_ID = 'onhood8r'
const DATASET = 'production'
const MAX_AGE_MS = 3600 * 1000

function parseCookies(header) {
  var cookies = {}
  ;(header || '').split(';').forEach(function (c) {
    var parts = c.trim().split('=')
    if (parts.length >= 2) cookies[parts[0]] = parts.slice(1).join('=')
  })
  return cookies
}

function verifyCookie(value, token) {
  if (!value || !value.includes('.')) return false
  var parts = value.split('.')
  var ts = parts[0]
  var sig = parts[1]
  var expected = crypto.createHmac('sha256', token).update(ts).digest('hex')
  if (sig !== expected) return false
  if (Date.now() - parseInt(ts, 10) > MAX_AGE_MS) return false
  return true
}

export default async function handler(req, res) {
  if (!process.env.SANITY_API_READ_TOKEN) {
    return res.status(500).json({ message: 'Server misconfigured' })
  }

  var cookies = parseCookies(req.headers.cookie)
  if (!verifyCookie(cookies.__sanity_preview, process.env.SANITY_API_READ_TOKEN)) {
    return res.status(401).json({ message: 'Invalid or missing preview cookie' })
  }

  var query = req.query.query
  if (!query) {
    return res.status(400).json({ message: 'Missing query parameter' })
  }

  var params = {}
  for (var key of Object.keys(req.query)) {
    if (key.startsWith('$')) {
      try { params[key.slice(1)] = JSON.parse(req.query[key]) } catch {}
    }
  }

  try {
    var studioUrl = process.env.SANITY_STUDIO_URL || 'https://studio.projct.co'

    var client = createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: '2025-06-01',
      useCdn: false,
      token: process.env.SANITY_API_READ_TOKEN,
      stega: {
        enabled: true,
        studioUrl: studioUrl,
      },
    })

    var result = await client.fetch(query, params, {
      perspective: 'drafts',
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ result })
  } catch (err) {
    console.error('Preview query error:', err)
    return res.status(500).json({ message: 'Query failed' })
  }
}
