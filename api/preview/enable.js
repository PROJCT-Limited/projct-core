import { createClient } from '@sanity/client'
import { validatePreviewUrl } from '@sanity/preview-url-secret'

const PROJECT_ID = 'onhood8r'
const DATASET = 'production'

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2025-06-01',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
})

export default async function handler(req, res) {
  if (!process.env.SANITY_API_READ_TOKEN) {
    return res.status(500).json({ message: 'Server misconfigured' })
  }

  try {
    const { isValid, redirectTo } = await validatePreviewUrl(client, req.url)

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid preview request' })
    }

    const isLocalhost = (req.headers.host || '').startsWith('localhost')
    const cookieOpts = isLocalhost
      ? 'Path=/; HttpOnly; SameSite=Lax; Max-Age=3600'
      : 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600'
    const flagOpts = isLocalhost
      ? 'Path=/; SameSite=Lax; Max-Age=3600'
      : 'Path=/; Secure; SameSite=None; Max-Age=3600'

    res.setHeader('Set-Cookie', [
      `__sanity_preview=1; ${cookieOpts}`,
      `sanity_preview_mode=1; ${flagOpts}`,
    ])

    var location = redirectTo || '/index3.html'
    if (location === '/' || location.startsWith('/?')) {
      location = '/index3.html' + (location.startsWith('/?') ? location.slice(1) : '')
    }
    res.writeHead(307, { Location: location })
    res.end()
  } catch (err) {
    console.error('Preview enable error:', err)
    return res.status(500).json({ message: 'Failed to enable preview' })
  }
}
