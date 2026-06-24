import { createClient } from '@sanity/client'

const PROJECT_ID = 'onhood8r'
const DATASET = 'production'

export default async function handler(req, res) {
  if (!process.env.SANITY_API_READ_TOKEN) {
    return res.status(500).json({ message: 'Server misconfigured' })
  }

  const referer = req.headers.referer || req.headers.origin || ''
  const isLocal = referer.includes('localhost')
  const isVercelPreview = referer.includes(process.env.VERCEL_URL || '__none__')
  if (!isLocal && !isVercelPreview) {
    return res.status(401).json({ message: 'Preview mode not enabled' })
  }

  const query = req.query.query
  if (!query) {
    return res.status(400).json({ message: 'Missing query parameter' })
  }

  const params = {}
  for (const [key, val] of Object.entries(req.query)) {
    if (key.startsWith('$')) {
      try { params[key.slice(1)] = JSON.parse(val) } catch {}
    }
  }

  try {
    const studioUrl = process.env.SANITY_STUDIO_URL || 'https://projct-website.sanity.studio'

    const client = createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: '2025-06-01',
      useCdn: false,
      token: process.env.SANITY_API_READ_TOKEN,
      stega: {
        enabled: true,
        studioUrl,
      },
    })

    const result = await client.fetch(query, params, {
      perspective: 'drafts',
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ result })
  } catch (err) {
    console.error('Preview query error:', err)
    return res.status(500).json({ message: 'Query failed' })
  }
}
